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
import { deck, flashcard, flashcardReviewLog } from "@/db/schema";
import {
  getAllDecksWithPathsForUser,
  getDescendantDeckIds,
} from "@/features/decks/queries";
import {
  LEARN_AHEAD_STATES,
  LEARN_AHEAD_WINDOW_MS,
} from "@/features/flashcard-review/constants";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs-settings";
import { LIMITS } from "@/lib/config/limits";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
  FlashcardStatisticsState,
} from "@/lib/server/api-contracts";

export interface GetDueFlashcardsOptions {
  deckId?: string;
  deckIds?: string[];
  limit?: number;
}

const recentTrendDays = 7;

async function getDeckPathMapForUser(
  userId: string,
): Promise<Map<string, string>> {
  const decks = await getAllDecksWithPathsForUser(userId);
  return new Map(
    decks.map((currentDeck) => [currentDeck.id, currentDeck.path]),
  );
}

async function getScopedFilters(
  userId: string,
  options: Pick<GetDueFlashcardsOptions, "deckId" | "deckIds"> = {},
): Promise<SQL<unknown>[]> {
  const filters: SQL<unknown>[] = [eq(flashcard.userId, userId)];

  if (options.deckIds && options.deckIds.length > 0) {
    filters.push(inArray(flashcard.deckId, options.deckIds));
  } else if (options.deckId) {
    const descendantDeckIds = await getDescendantDeckIds(
      userId,
      options.deckId,
    );
    filters.push(inArray(flashcard.deckId, descendantDeckIds));
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

  const [filters, deckPathMap] = await Promise.all([
    getDueFilters(userId, now, options),
    getDeckPathMapForUser(userId),
  ]);

  return getDb()
    .select({ flashcard, deckName: deck.name })
    .from(flashcard)
    .innerJoin(deck, eq(flashcard.deckId, deck.id))
    .where(and(...filters))
    .orderBy(asc(flashcard.dueAt), asc(flashcard.createdAt))
    .limit(limit)
    .then((rows) =>
      rows.map((row) => ({
        ...row.flashcard,
        deckName: row.deckName,
        deckPath: deckPathMap.get(row.flashcard.deckId) ?? row.deckName,
      })),
    );
}

export async function getFlashcardReviewSummaryForUser(
  userId: string,
  now: Date,
  options: Pick<GetDueFlashcardsOptions, "deckId" | "deckIds"> = {},
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

export async function getFlashcardStatisticsForUser(
  userId: string,
  now: Date,
  options: Pick<GetDueFlashcardsOptions, "deckId" | "deckIds"> = {},
): Promise<FlashcardStatisticsState> {
  const flashcardFilters = await getScopedFilters(userId, options);
  const reviewFilters: SQL<unknown>[] = [
    eq(flashcardReviewLog.userId, userId),
    eq(flashcard.userId, userId),
  ];

  if (options.deckIds && options.deckIds.length > 0) {
    reviewFilters.push(inArray(flashcard.deckId, options.deckIds));
  } else if (options.deckId) {
    const descendantDeckIds = await getDescendantDeckIds(
      userId,
      options.deckId,
    );
    reviewFilters.push(inArray(flashcard.deckId, descendantDeckIds));
  }

  const trendStart = new Date(now);
  trendStart.setHours(0, 0, 0, 0);
  trendStart.setDate(trendStart.getDate() - (recentTrendDays - 1));

  const [summaryRows, stateRows, ratingRows, trendRows] = await Promise.all([
    getDb()
      .select({
        totalCards: count(),
        dueCards: sql<number>`coalesce(sum(case when ${buildDueAtFilter(now)} then 1 else 0 end), 0)`,
        reviewedCards: sql<number>`coalesce(sum(case when ${flashcard.reviewCount} > 0 then 1 else 0 end), 0)`,
        totalReviews: sql<number>`coalesce(sum(${flashcard.reviewCount}), 0)`,
        totalLapses: sql<number>`coalesce(sum(${flashcard.lapseCount}), 0)`,
      })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(...flashcardFilters)),
    getDb()
      .select({
        state: flashcard.state,
        count: count(),
      })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(...flashcardFilters))
      .groupBy(flashcard.state),
    getDb()
      .select({
        rating: flashcardReviewLog.rating,
        count: count(),
      })
      .from(flashcardReviewLog)
      .innerJoin(flashcard, eq(flashcardReviewLog.flashcardId, flashcard.id))
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(...reviewFilters))
      .groupBy(flashcardReviewLog.rating),
    getDb()
      .select({
        date: sql<string>`to_char(date_trunc('day', ${flashcardReviewLog.reviewedAt}), 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(flashcardReviewLog)
      .innerJoin(flashcard, eq(flashcardReviewLog.flashcardId, flashcard.id))
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
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
  deckId: string;
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
  deckName: string;
  deckPath?: string;
} | null> {
  const [rows, deckPathMap] = await Promise.all([
    getDb()
      .select({ flashcard, deckName: deck.name })
      .from(flashcard)
      .innerJoin(deck, eq(flashcard.deckId, deck.id))
      .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
      .limit(1),
    getDeckPathMapForUser(userId),
  ]);

  return rows[0]
    ? {
        ...rows[0].flashcard,
        deckName: rows[0].deckName,
        deckPath: deckPathMap.get(rows[0].flashcard.deckId) ?? rows[0].deckName,
      }
    : null;
}

export async function getAllFlashcardsForExam(
  userId: string,
  options: Pick<GetDueFlashcardsOptions, "deckId" | "deckIds"> = {},
): Promise<FlashcardReviewEntity[]> {
  const [filters, deckPathMap] = await Promise.all([
    getScopedFilters(userId, options),
    getDeckPathMapForUser(userId),
  ]);

  return getDb()
    .select({ flashcard, deckName: deck.name })
    .from(flashcard)
    .innerJoin(deck, eq(flashcard.deckId, deck.id))
    .where(and(...filters))
    .orderBy(asc(flashcard.createdAt))
    .then((rows) =>
      rows.map((row) => ({
        ...row.flashcard,
        deckName: row.deckName,
        deckPath: deckPathMap.get(row.flashcard.deckId) ?? row.deckName,
      })),
    );
}
