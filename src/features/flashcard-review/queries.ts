import { and, asc, count, eq, isNull, lte, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { flashcard, subject } from "@/db/schema";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs-settings";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
} from "@/lib/server/api-contracts";

export interface GetDueFlashcardsOptions {
  subjectId?: string;
  limit?: number;
}

const defaultDueLimit = 50;

function getDueFilters(
  userId: string,
  now: Date,
  options: GetDueFlashcardsOptions,
): SQL<unknown>[] {
  const filters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    eq(subject.userId, userId),
    lte(flashcard.dueAt, now),
    isNull(subject.archivedAt),
  ];

  if (options.subjectId) {
    filters.push(eq(flashcard.subjectId, options.subjectId));
  }

  return filters;
}

export async function getDueFlashcardsForUser(
  userId: string,
  now: Date,
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewEntity[]> {
  const limit =
    options.limit && options.limit > 0
      ? Math.min(options.limit, 200)
      : defaultDueLimit;

  return db
    .select({ flashcard })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(and(...getDueFilters(userId, now, options)))
    .orderBy(asc(flashcard.dueAt), asc(flashcard.createdAt))
    .limit(limit)
    .then((rows) => rows.map((row) => row.flashcard));
}

export async function getFlashcardReviewSummaryForUser(
  userId: string,
  now: Date,
  options: Pick<GetDueFlashcardsOptions, "subjectId"> = {},
): Promise<FlashcardReviewSummary> {
  const baseFilters: SQL<unknown>[] = [
    eq(flashcard.userId, userId),
    eq(subject.userId, userId),
    isNull(subject.archivedAt),
  ];

  if (options.subjectId) {
    baseFilters.push(eq(flashcard.subjectId, options.subjectId));
  }

  const [dueResult, totalResult] = await Promise.all([
    db
      .select({ total: count() })
      .from(flashcard)
      .innerJoin(subject, eq(flashcard.subjectId, subject.id))
      .where(and(...baseFilters, lte(flashcard.dueAt, now))),
    db
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
) {
  return db
    .select({ flashcard })
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
    .then((rows) => rows[0]?.flashcard ?? null);
}
