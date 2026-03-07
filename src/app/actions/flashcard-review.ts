"use server";

import { and, asc, count, eq, isNull, lte, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { flashcard, flashcardReviewLog, subject } from "@/db/schema";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
  ReviewFlashcardResult,
} from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { scheduleFlashcardReview } from "@/lib/fsrs";
import {
  ensureFsrsSettings,
  maybeOptimizeFsrsParameters,
} from "@/lib/fsrs-settings";
import { actionError } from "@/lib/server-action-errors";
import {
  type ReviewFlashcardForm,
  reviewFlashcardSchema,
} from "@/lib/validations/flashcard-review";

interface GetDueFlashcardsOptions {
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

async function getDueFlashcardsForUser(
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

export async function getDueFlashcards(
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewEntity[]> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getDueFlashcardsForUser(userId, new Date(), options);
}

async function getFlashcardReviewSummaryForUser(
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

export async function getFlashcardReviewSummary(
  options: Pick<GetDueFlashcardsOptions, "subjectId"> = {},
): Promise<FlashcardReviewSummary> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getFlashcardReviewSummaryForUser(userId, new Date(), options);
}

export async function getFlashcardReviewState(
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewState> {
  const userId = await getAuthenticatedUserId();
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

export async function reviewFlashcard(
  data: ReviewFlashcardForm,
): Promise<ReviewFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = reviewFlashcardSchema.safeParse(data);

  if (!parsed.success) {
    return actionError("flashcards.review.invalidData");
  }

  const settings = await ensureFsrsSettings(userId);

  const now = new Date();

  const existingCard = await db
    .select({ flashcard })
    .from(flashcard)
    .innerJoin(subject, eq(flashcard.subjectId, subject.id))
    .where(
      and(
        eq(flashcard.id, parsed.data.id),
        eq(flashcard.userId, userId),
        eq(subject.userId, userId),
        isNull(subject.archivedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]?.flashcard ?? null);

  if (!existingCard) {
    return actionError("flashcards.review.notFound");
  }

  if (existingCard.dueAt.getTime() > now.getTime()) {
    return actionError("flashcards.review.notDue");
  }

  const nextState = scheduleFlashcardReview({
    card: {
      state: existingCard.state,
      dueAt: existingCard.dueAt,
      stability: existingCard.stability,
      difficulty: existingCard.difficulty,
      intervalDays: existingCard.intervalDays,
      learningStep: existingCard.learningStep,
      lastReviewedAt: existingCard.lastReviewedAt,
      reviewCount: existingCard.reviewCount,
      lapseCount: existingCard.lapseCount,
    },
    grade: parsed.data.grade,
    now,
    desiredRetention: settings.desiredRetention,
    weights: settings.weights,
  });

  const updatedCard = await db.transaction(async (tx) => {
    const updatedCards = await tx
      .update(flashcard)
      .set({
        state: nextState.state,
        dueAt: nextState.dueAt,
        stability: nextState.stability,
        difficulty: nextState.difficulty,
        ease: nextState.ease,
        intervalDays: nextState.intervalDays,
        learningStep: nextState.learningStep,
        lastReviewedAt: nextState.lastReviewedAt,
        reviewCount: nextState.reviewCount,
        lapseCount: nextState.lapseCount,
        updatedAt: nextState.updatedAt,
      })
      .where(
        and(eq(flashcard.id, existingCard.id), eq(flashcard.userId, userId)),
      )
      .returning({
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        subjectId: flashcard.subjectId,
        state: flashcard.state,
        dueAt: flashcard.dueAt,
        stability: flashcard.stability,
        difficulty: flashcard.difficulty,
        ease: flashcard.ease,
        intervalDays: flashcard.intervalDays,
        learningStep: flashcard.learningStep,
        lastReviewedAt: flashcard.lastReviewedAt,
        reviewCount: flashcard.reviewCount,
        lapseCount: flashcard.lapseCount,
      });

    await tx.insert(flashcardReviewLog).values({
      flashcardId: existingCard.id,
      userId,
      rating: parsed.data.grade,
      reviewedAt: now,
      daysElapsed: nextState.daysElapsed,
    });

    return updatedCards[0];
  });

  if (!updatedCard) {
    return actionError("flashcards.review.notFound");
  }

  await maybeOptimizeFsrsParameters(userId);

  revalidatePath(`/subjects/${existingCard.subjectId}`);
  return {
    success: true,
    reviewedCardId: existingCard.id,
    flashcard: updatedCard,
  };
}
