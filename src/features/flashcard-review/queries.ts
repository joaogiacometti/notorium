import { and, asc, count, eq, gte, inArray, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, flashcardReviewLog, subject } from "@/db/schema";
import { buildDueAtFilter } from "@/features/flashcard-review/due-filter";
import { computeReviewStreaks } from "@/features/flashcard-review/streaks";
import { readFsrsSettings } from "@/features/flashcards/fsrs/settings-queries";
import { attachFlashcardSources } from "@/features/flashcards/source-queries";
import {
  getDescendantSubjectIds,
  getSubjectPathMapForUser,
} from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardReviewActivity,
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
  ReviewActivityPoint,
} from "@/lib/server/api-contracts";

type ReviewableFlashcard = Pick<
  FlashcardReviewEntity,
  | "id"
  | "subjectId"
  | "state"
  | "dueAt"
  | "stability"
  | "difficulty"
  | "intervalDays"
  | "learningStep"
  | "lastReviewedAt"
  | "reviewCount"
  | "lapseCount"
>;

export interface GetDueFlashcardsOptions {
  subjectId?: string;
  subjectIds?: string[];
  limit?: number;
}

const heatmapDays = 365;

type ReviewEntityRow = {
  flashcard: typeof flashcard.$inferSelect;
  subjectName: string;
};

function toReviewEntity(
  row: ReviewEntityRow,
  subjectPathMap: Map<string, string>,
): ReviewEntityRow["flashcard"] & FlashcardReviewEntity {
  return {
    ...row.flashcard,
    subjectName: row.subjectName,
    subjectPath: subjectPathMap.get(row.flashcard.subjectId) ?? row.subjectName,
  };
}

async function getScopedFilters(
  userId: string,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "subjectIds"> = {},
): Promise<SQL<unknown>[]> {
  const filters: SQL<unknown>[] = [eq(flashcard.userId, userId)];

  if (options.subjectIds && options.subjectIds.length > 0) {
    filters.push(inArray(flashcard.subjectId, options.subjectIds));
  } else if (options.subjectId) {
    const descendantSubjectIds = await getDescendantSubjectIds(
      userId,
      options.subjectId,
    );
    filters.push(inArray(flashcard.subjectId, descendantSubjectIds));
  }

  return filters;
}

function resolveDueLimit(limit: number | undefined): number {
  return limit && limit > 0
    ? Math.min(limit, LIMITS.reviewDueLimitMax)
    : LIMITS.reviewDueLimitDefault;
}

async function selectDueFlashcards(
  userId: string,
  scopeFilters: SQL<unknown>[],
  subjectPathMap: Map<string, string>,
  now: Date,
  limit: number,
): Promise<FlashcardReviewEntity[]> {
  const rows = await getDb()
    .select({ flashcard, subjectName: subject.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(and(...scopeFilters, buildDueAtFilter(now)))
    .orderBy(asc(flashcard.dueAt), asc(flashcard.createdAt))
    .limit(limit);

  return attachFlashcardSources(
    userId,
    rows.map((row) => toReviewEntity(row, subjectPathMap)),
  );
}

async function countScopedFlashcards(
  scopeFilters: SQL<unknown>[],
  now: Date,
): Promise<FlashcardReviewSummary> {
  const rows = await getDb()
    .select({
      total: count(),
      due: sql<number>`count(*) filter (where ${buildDueAtFilter(now)})`.mapWith(
        Number,
      ),
    })
    .from(flashcard)
    .where(and(...scopeFilters));

  return { dueCount: rows[0]?.due ?? 0, totalCount: rows[0]?.total ?? 0 };
}

/**
 * Due and total card counts for the user, optionally scoped to a subject
 * subtree. Feeds the home dashboard and the review hub badges.
 *
 * @example
 * const { dueCount } = await getFlashcardReviewSummaryForUser(userId, new Date());
 */
export async function getFlashcardReviewSummaryForUser(
  userId: string,
  now: Date,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "subjectIds"> = {},
): Promise<FlashcardReviewSummary> {
  return countScopedFlashcards(await getScopedFilters(userId, options), now);
}

/**
 * Daily review counts for the trailing year plus current/longest streaks
 * across all of the user's reviews. Feeds the home "Review activity" heatmap.
 * Kept lean — only the heatmap aggregation, no card/rating breakdowns.
 *
 * @example
 * const activity = await getFlashcardReviewActivityForUser(userId, new Date());
 */
export async function getFlashcardReviewActivityForUser(
  userId: string,
  now: Date,
): Promise<FlashcardReviewActivity> {
  const heatmapStart = new Date(now);
  heatmapStart.setHours(0, 0, 0, 0);
  heatmapStart.setDate(heatmapStart.getDate() - (heatmapDays - 1));

  const heatmapRows = await getDb()
    .select({
      date: sql<string>`to_char(date_trunc('day', ${flashcardReviewLog.reviewedAt}), 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(flashcardReviewLog)
    .where(
      and(
        eq(flashcardReviewLog.userId, userId),
        gte(flashcardReviewLog.reviewedAt, heatmapStart),
      ),
    )
    .groupBy(sql`date_trunc('day', ${flashcardReviewLog.reviewedAt})`)
    .orderBy(sql`date_trunc('day', ${flashcardReviewLog.reviewedAt})`);

  const countByDate = new Map(heatmapRows.map((row) => [row.date, row.count]));

  const heatmap: ReviewActivityPoint[] = Array.from(
    { length: heatmapDays },
    (_, index) => {
      const date = new Date(heatmapStart);
      date.setDate(heatmapStart.getDate() + index);
      const key = date.toISOString().slice(0, 10);

      return { date: key, count: countByDate.get(key) ?? 0 };
    },
  );

  return {
    heatmap,
    streak: computeReviewStreaks(heatmap),
  };
}

/**
 * The due-card batch, counts, and scheduler settings for a review session.
 * Scope filters are resolved once and shared by the card and count queries.
 *
 * @example
 * const state = await getFlashcardReviewStateForUser(userId, { limit: 50 });
 */
export async function getFlashcardReviewStateForUser(
  userId: string,
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewState> {
  const now = new Date();
  const [settings, scopeFilters, subjectPathMap] = await Promise.all([
    readFsrsSettings(userId),
    getScopedFilters(userId, options),
    getSubjectPathMapForUser(userId),
  ]);
  const [cards, summary] = await Promise.all([
    selectDueFlashcards(
      userId,
      scopeFilters,
      subjectPathMap,
      now,
      resolveDueLimit(options.limit),
    ),
    countScopedFlashcards(scopeFilters, now),
  ]);

  return {
    cards,
    summary,
    scheduler: {
      desiredRetention: settings.desiredRetention,
      weights: settings.weights,
    },
  };
}

/**
 * Load only the columns a grade needs: ownership, subject, and scheduling
 * state. The client already holds the card's subject name and path, so no
 * subject join or path lookup runs on the grading hot path.
 *
 * @example
 * const card = await getReviewableFlashcardForUser(userId, flashcardId);
 */
export async function getReviewableFlashcardForUser(
  userId: string,
  flashcardId: string,
): Promise<ReviewableFlashcard | null> {
  const rows = await getDb()
    .select({
      id: flashcard.id,
      subjectId: flashcard.subjectId,
      state: flashcard.state,
      dueAt: flashcard.dueAt,
      stability: flashcard.stability,
      difficulty: flashcard.difficulty,
      intervalDays: flashcard.intervalDays,
      learningStep: flashcard.learningStep,
      lastReviewedAt: flashcard.lastReviewedAt,
      reviewCount: flashcard.reviewCount,
      lapseCount: flashcard.lapseCount,
    })
    .from(flashcard)
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAllFlashcardsForExam(
  userId: string,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "subjectIds"> = {},
): Promise<FlashcardReviewEntity[]> {
  const [filters, subjectPathMap] = await Promise.all([
    getScopedFilters(userId, options),
    getSubjectPathMapForUser(userId),
  ]);

  return getDb()
    .select({ flashcard, subjectName: subject.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(and(...filters))
    .orderBy(asc(flashcard.createdAt))
    .then((rows) =>
      attachFlashcardSources(
        userId,
        rows.map((row) => toReviewEntity(row, subjectPathMap)),
      ),
    );
}
