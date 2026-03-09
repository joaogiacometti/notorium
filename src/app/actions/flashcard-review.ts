"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { flashcard, flashcardReviewLog } from "@/db/schema";
import {
  type GetDueFlashcardsOptions,
  getDueFlashcardsForUser,
  getFlashcardReviewStateForUser,
  getFlashcardReviewSummaryForUser,
  getReviewableFlashcardForUser,
} from "@/features/flashcard-review/queries";
import { revalidateFlashcardReviewSubjectPaths } from "@/features/flashcard-review/revalidation";
import {
  type ReviewFlashcardForm,
  reviewFlashcardSchema,
} from "@/features/flashcard-review/validation";
import {
  type ReviewGrade,
  scheduleFlashcardReview,
} from "@/features/flashcards/fsrs";
import {
  ensureFsrsSettings,
  maybeOptimizeFsrsParameters,
} from "@/features/flashcards/fsrs-settings";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { parseActionInput } from "@/lib/server/action-input";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
  ReviewFlashcardResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

type ReviewFlashcardFailureStage = "persist" | "optimize" | "revalidate";

function logReviewFlashcardFailure(
  stage: ReviewFlashcardFailureStage,
  context: {
    flashcardId: string;
    userId: string;
    grade: ReviewGrade;
    subjectId: string;
  },
  error: unknown,
) {
  console.error("Flashcard review action failed", {
    stage,
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function getDueFlashcards(
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewEntity[]> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getDueFlashcardsForUser(userId, new Date(), options);
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
  return getFlashcardReviewStateForUser(userId, options);
}

export async function reviewFlashcard(
  data: ReviewFlashcardForm,
): Promise<ReviewFlashcardResult> {
  const userId = await getAuthenticatedUserId();
  const parsed = parseActionInput(
    reviewFlashcardSchema,
    data,
    "flashcards.review.invalidData",
  );

  if (!parsed.success) {
    return parsed.error;
  }

  const settings = await ensureFsrsSettings(userId);

  const now = new Date();

  const existingCard = await getReviewableFlashcardForUser(
    userId,
    parsed.data.id,
  );

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

  const failureContext = {
    flashcardId: existingCard.id,
    userId,
    grade: parsed.data.grade,
    subjectId: existingCard.subjectId,
  } as const;

  let updatedCard: FlashcardReviewEntity | undefined;

  try {
    updatedCard = await db.transaction(async (tx) => {
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
  } catch (error) {
    logReviewFlashcardFailure("persist", failureContext, error);
    return actionError("flashcards.review.unavailable");
  }

  if (!updatedCard) {
    return actionError("flashcards.review.notFound");
  }

  try {
    await maybeOptimizeFsrsParameters(userId);
  } catch (error) {
    logReviewFlashcardFailure("optimize", failureContext, error);
  }

  try {
    revalidateFlashcardReviewSubjectPaths(existingCard.subjectId);
  } catch (error) {
    logReviewFlashcardFailure("revalidate", failureContext, error);
  }

  return {
    success: true,
    reviewedCardId: existingCard.id,
    flashcard: updatedCard,
  };
}
