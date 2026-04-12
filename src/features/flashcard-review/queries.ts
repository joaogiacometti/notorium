import {
  and,
  asc,
  count,
  eq,
  gte,
  isNull,
  lte,
  type SQL,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard, flashcardReviewLog, subject } from "@/db/schema";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs-settings";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
  FlashcardStatisticsState,
} from "@/lib/server/api-contracts";

export interface GetDueFlashcardsOptions {
  subjectId?: string;
  deckId?: string;
  limit?: number;
}

const recentTrendDays = 7;

function getScopedFilters(
  userId: string,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "deckId"> = {},
): SQL<unknown>[] {
  const filters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    eq(subject.userId, userId),
    isNull(subject.archivedAt),
  ];

  if (options.subjectId) {
    filters.push(eq(flashcard.subjectId, options.subjectId));
  }

  if (options.deckId) {
    filters.push(eq(flashcard.deckId, options.deckId));
  }

  return filters;
}

function getDueFilters(
  userId: string,
  now: Date,
  options: GetDueFlashcardsOptions,
): SQL<unknown>[] {
  return [...getScopedFilters(userId, options), lte(flashcard.dueAt, now)];
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

  return getDb()
    .select({ flashcard, subjectName: subject.name, deckName: deck.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .leftJoin(deck, eq(flashcard.deckId, deck.id))
    .where(and(...getDueFilters(userId, now, options)))
    .orderBy(asc(flashcard.dueAt), asc(flashcard.createdAt))
    .limit(limit)
    .then((rows) =>
      rows.map((row) => ({
        ...row.flashcard,
        subjectName: row.subjectName,
        deckName: row.deckName,
      })),
    );
}

export async function getFlashcardReviewSummaryForUser(
  userId: string,
  now: Date,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "deckId"> = {},
): Promise<FlashcardReviewSummary> {
  const baseFilters = getScopedFilters(userId, options);

  const [dueResult, totalResult] = await Promise.all([
    getDb()
      .select({ total: count() })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...baseFilters, lte(flashcard.dueAt, now))),
    getDb()
      .select({ total: count() })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...baseFilters)),
  ]);

  return {
    dueCount: dueResult[0]?.total ?? 0,
    totalCount: totalResult[0]?.total ?? 0,
  };
}

export async function getFlashcardStatisticsForUser(
  userId: string,
  now: Date,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "deckId"> = {},
): Promise<FlashcardStatisticsState> {
  const flashcardFilters = getScopedFilters(userId, options);
  const reviewFilters: SQL<unknown>[] = [
    eq(flashcardReviewLog.userId, userId),
    eq(flashcard.userId, userId),
    eq(subject.userId, userId),
    isNull(subject.archivedAt),
  ];

  if (options.subjectId) {
    reviewFilters.push(eq(flashcard.subjectId, options.subjectId));
  }

  if (options.deckId) {
    reviewFilters.push(eq(flashcard.deckId, options.deckId));
  }

  const trendStart = new Date(now);
  trendStart.setHours(0, 0, 0, 0);
  trendStart.setDate(trendStart.getDate() - (recentTrendDays - 1));

  const [summaryRows, stateRows, ratingRows, trendRows] = await Promise.all([
    getDb()
      .select({
        totalCards: count(),
        dueCards: sql<number>`coalesce(sum(case when ${flashcard.dueAt} <= ${now} then 1 else 0 end), 0)`,
        reviewedCards: sql<number>`coalesce(sum(case when ${flashcard.reviewCount} > 0 then 1 else 0 end), 0)`,
        totalReviews: sql<number>`coalesce(sum(${flashcard.reviewCount}), 0)`,
        totalLapses: sql<number>`coalesce(sum(${flashcard.lapseCount}), 0)`,
      })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...flashcardFilters)),
    getDb()
      .select({
        state: flashcard.state,
        count: count(),
      })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...flashcardFilters))
      .groupBy(flashcard.state),
    getDb()
      .select({
        rating: flashcardReviewLog.rating,
        count: count(),
      })
      .from(flashcardReviewLog)
      .innerJoin(flashcard, eq(flashcardReviewLog.flashcardId, flashcard.id))
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...reviewFilters))
      .groupBy(flashcardReviewLog.rating),
    getDb()
      .select({
        date: sql<string>`to_char(date_trunc('day', ${flashcardReviewLog.reviewedAt}), 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(flashcardReviewLog)
      .innerJoin(flashcard, eq(flashcardReviewLog.flashcardId, flashcard.id))
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(
        and(...reviewFilters, gte(flashcardReviewLog.reviewedAt, trendStart)),
      )
      .groupBy(sql`date_trunc('day', ${flashcardReviewLog.reviewedAt})`)
      .orderBy(sql`date_trunc('day', ${flashcardReviewLog.reviewedAt})`),
  ]);

  const summaryRow = summaryRows[0];
  const totalCards = summaryRow?.totalCards ?? 0;
  const dueCards = summaryRow?.dueCards ?? 0;
  const reviewedCards = summaryRow?.reviewedCards ?? 0;
  const totalReviews = summaryRow?.totalReviews ?? 0;
  const totalLapses = summaryRow?.totalLapses ?? 0;
  const trendByDate = new Map(trendRows.map((row) => [row.date, row.count]));

  return {
    summary: {
      totalCards,
      dueCards,
      reviewedCards,
      neverReviewedCards: Math.max(0, totalCards - reviewedCards),
      totalReviews,
      totalLapses,
      averageReviewsPerCard: totalCards > 0 ? totalReviews / totalCards : 0,
      averageLapsesPerReviewedCard:
        reviewedCards > 0 ? totalLapses / reviewedCards : 0,
    },
    states: ["new", "learning", "review", "relearning"].map((stateKey) => ({
      key: stateKey,
      label:
        stateKey === "new"
          ? "New"
          : stateKey === "learning"
            ? "Learning"
            : stateKey === "review"
              ? "Review"
              : "Relearning",
      count: stateRows.find((row) => row.state === stateKey)?.count ?? 0,
    })),
    ratings: ["again", "hard", "good", "easy"].map((ratingKey) => ({
      key: ratingKey,
      label:
        ratingKey === "again"
          ? "Again"
          : ratingKey === "hard"
            ? "Hard"
            : ratingKey === "good"
              ? "Good"
              : "Easy",
      count: ratingRows.find((row) => row.rating === ratingKey)?.count ?? 0,
    })),
    trend: Array.from({ length: recentTrendDays }, (_, index) => {
      const date = new Date(trendStart);
      date.setDate(trendStart.getDate() + index);
      const key = date.toISOString().slice(0, 10);

      return {
        date: key,
        count: trendByDate.get(key) ?? 0,
      };
    }),
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
  subjectId: string;
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
} | null> {
  return getDb()
    .select({ flashcard, subjectName: subject.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, flashcardId),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1)
    .then((rows) =>
      rows[0]
        ? {
            ...rows[0].flashcard,
            subjectName: rows[0].subjectName,
          }
        : null,
    );
}

export async function getAllFlashcardsForExam(
  userId: string,
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "deckId"> = {},
): Promise<FlashcardReviewEntity[]> {
  const filters = getScopedFilters(userId, options);

  return getDb()
    .select({ flashcard, subjectName: subject.name, deckName: deck.name })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .leftJoin(deck, eq(flashcard.deckId, deck.id))
    .where(and(...filters))
    .orderBy(asc(flashcard.createdAt))
    .then((rows) =>
      rows.map((row) => ({
        ...row.flashcard,
        subjectName: row.subjectName,
        deckName: row.deckName,
      })),
    );
}
