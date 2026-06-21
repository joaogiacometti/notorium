import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, flashcardReviewLog, subject } from "@/db/schema";
import {
  LEARN_AHEAD_STATES,
  LEARN_AHEAD_WINDOW_MS,
} from "@/features/flashcard-review/constants";
import { computeReviewStreaks } from "@/features/flashcard-review/streaks";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs/settings";
import {
  getAllSubjectsWithPathsForUser,
  getDescendantSubjectIds,
  getSubjectPathForUser,
} from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardReviewActivity,
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
  FlashcardStatisticsTrendPoint,
} from "@/lib/server/api-contracts";

export interface GetDueFlashcardsOptions {
  subjectId?: string;
  subjectIds?: string[];
  limit?: number;
}

const heatmapDays = 365;

async function getSubjectPathMapForUser(
  userId: string,
): Promise<Map<string, string>> {
  const subjects = await getAllSubjectsWithPathsForUser(userId);
  return new Map(
    subjects.map((currentSubject) => [currentSubject.id, currentSubject.path]),
  );
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

function buildDueAtFilter(now: Date): SQL<unknown> {
  const aheadCutoff = new Date(now.getTime() + LEARN_AHEAD_WINDOW_MS);
  return or(
    lte(flashcard.dueAt, now),
    and(
      inArray(flashcard.state, LEARN_AHEAD_STATES),
      lte(flashcard.dueAt, aheadCutoff),
    ),
  ) as SQL<unknown>;
}

async function getDueFilters(
  userId: string,
  now: Date,
  options: GetDueFlashcardsOptions,
): Promise<SQL<unknown>[]> {
  return [...(await getScopedFilters(userId, options)), buildDueAtFilter(now)];
}

export async function getDueFlashcardsForUser(
  userId: string,
  now: Date,
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewEntity[]> {
  const limit =
    options.limit && options.limit > 0
      ? Math.min(options.limit, LIMITS.reviewDueLimitMax)
      : LIMITS.reviewDueLimitDefault;

  const [filters, subjectPathMap] = await Promise.all([
    getDueFilters(userId, now, options),
    getSubjectPathMapForUser(userId),
  ]);

  return getDb()
    .select({ flashcard, subjectName: subject.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(and(...filters))
    .orderBy(asc(flashcard.dueAt), asc(flashcard.createdAt))
    .limit(limit)
    .then((rows) =>
      rows.map((row) => ({
        ...row.flashcard,
        subjectName: row.subjectName,
        subjectPath:
          (row.flashcard.subjectId
            ? subjectPathMap.get(row.flashcard.subjectId)
            : undefined) ?? row.subjectName,
      })),
    );
}

export async function getFlashcardReviewSummaryForUser(
  userId: string,
  now: Date,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "subjectIds"> = {},
): Promise<FlashcardReviewSummary> {
  const baseFilters = await getScopedFilters(userId, options);

  const [dueResult, totalResult] = await Promise.all([
    getDb()
      .select({ total: count() })
      .from(flashcard)
      .where(and(...baseFilters, buildDueAtFilter(now))),
    getDb()
      .select({ total: count() })
      .from(flashcard)
      .where(and(...baseFilters)),
  ]);

  return {
    dueCount: dueResult[0]?.total ?? 0,
    totalCount: totalResult[0]?.total ?? 0,
  };
}

/**
 * Daily review counts for the trailing year plus current/longest streaks,
 * scoped to the user (or a subject subtree). Feeds the home "Review activity"
 * heatmap. Kept lean — only the heatmap aggregation, no card/rating breakdowns.
 */
export async function getFlashcardReviewActivityForUser(
  userId: string,
  now: Date,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "subjectIds"> = {},
): Promise<FlashcardReviewActivity> {
  const reviewFilters: SQL<unknown>[] = [
    eq(flashcardReviewLog.userId, userId),
    eq(flashcard.userId, userId),
  ];

  if (options.subjectIds && options.subjectIds.length > 0) {
    reviewFilters.push(inArray(flashcard.subjectId, options.subjectIds));
  } else if (options.subjectId) {
    const descendantSubjectIds = await getDescendantSubjectIds(
      userId,
      options.subjectId,
    );
    reviewFilters.push(inArray(flashcard.subjectId, descendantSubjectIds));
  }

  const heatmapStart = new Date(now);
  heatmapStart.setHours(0, 0, 0, 0);
  heatmapStart.setDate(heatmapStart.getDate() - (heatmapDays - 1));

  const heatmapRows = await getDb()
    .select({
      date: sql<string>`to_char(date_trunc('day', ${flashcardReviewLog.reviewedAt}), 'YYYY-MM-DD')`,
      count: count(),
    })
    .from(flashcardReviewLog)
    .innerJoin(flashcard, eq(flashcardReviewLog.flashcardId, flashcard.id))
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(...reviewFilters, gte(flashcardReviewLog.reviewedAt, heatmapStart)),
    )
    .groupBy(sql`date_trunc('day', ${flashcardReviewLog.reviewedAt})`)
    .orderBy(sql`date_trunc('day', ${flashcardReviewLog.reviewedAt})`);

  const countByDate = new Map(heatmapRows.map((row) => [row.date, row.count]));

  const heatmap: FlashcardStatisticsTrendPoint[] = Array.from(
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

export async function getFlashcardReviewStateForUser(
  userId: string,
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewState> {
  const settings = await ensureFsrsSettings(userId);
  const now = new Date();
  const [cards, summary] = await Promise.all([
    getDueFlashcardsForUser(userId, now, options),
    getFlashcardReviewSummaryForUser(userId, now, options),
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

export async function getReviewableFlashcardForUser(
  userId: string,
  flashcardId: string,
): Promise<{
  id: string;
  subjectId: string | null;
  userId: string;
  state: FlashcardReviewEntity["state"];
  dueAt: Date;
  stability: string | null;
  difficulty: string | null;
  ease: number;
  intervalDays: number;
  learningStep: number | null;
  lastReviewedAt: Date | null;
  reviewCount: number;
  lapseCount: number;
  subjectName: string;
  subjectPath?: string;
} | null> {
  const rows = await getDb()
    .select({ flashcard, subjectName: subject.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  if (!rows[0]) {
    return null;
  }

  // One card only needs its own subject path, not the whole library's path map.
  const subjectPath = rows[0].flashcard.subjectId
    ? await getSubjectPathForUser(userId, rows[0].flashcard.subjectId)
    : "";

  return {
    ...rows[0].flashcard,
    subjectName: rows[0].subjectName,
    subjectPath: subjectPath || rows[0].subjectName,
  };
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
      rows.map((row) => ({
        ...row.flashcard,
        subjectName: row.subjectName,
        subjectPath:
          (row.flashcard.subjectId
            ? subjectPathMap.get(row.flashcard.subjectId)
            : undefined) ?? row.subjectName,
      })),
    );
}
