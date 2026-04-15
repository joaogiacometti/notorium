import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, flashcardReviewLog } from "@/db/schema";
import { getReviewableFlashcardForUser } from "@/features/flashcard-review/queries";
import type { ReviewFlashcardForm } from "@/features/flashcard-review/validation";
import { scheduleFlashcardReview } from "@/features/flashcards/fsrs";
import {
  ensureFsrsSettings,
  maybeOptimizeFsrsParameters,
} from "@/features/flashcards/fsrs-settings";
import type {
  FlashcardReviewEntity,
  ReviewFlashcardResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

function getFlashcardReviewUpdateValues(
  nextState: ReturnType<typeof scheduleFlashcardReview>,
) {
  return {
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
  };
}

export async function reviewFlashcardForUser(
  userId: string,
  data: ReviewFlashcardForm,
): Promise<ReviewFlashcardResult> {
  const settings = await ensureFsrsSettings(userId);
  const existingCard = await getReviewableFlashcardForUser(userId, data.id);
  const now = new Date();

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
    grade: data.grade,
    now,
    desiredRetention: settings.desiredRetention,
    weights: settings.weights,
  });

  let updatedCard: FlashcardReviewEntity | undefined;

  try {
    updatedCard = await getDb().transaction(async (tx) => {
      const updatedCards = await tx
        .update(flashcard)
        .set(getFlashcardReviewUpdateValues(nextState))
        .where(
          and(eq(flashcard.id, existingCard.id), eq(flashcard.userId, userId)),
        )
        .returning({
          id: flashcard.id,
          front: flashcard.front,
          back: flashcard.back,
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
          deckId: flashcard.deckId,
        });

      await tx.insert(flashcardReviewLog).values({
        flashcardId: existingCard.id,
        userId,
        rating: data.grade,
        reviewedAt: now,
        daysElapsed: nextState.daysElapsed,
      });

      return updatedCards[0];
    });
  } catch {
    return actionError("flashcards.review.unavailable");
  }

  if (!updatedCard) {
    return actionError("flashcards.review.notFound");
  }

  void maybeOptimizeFsrsParameters(userId).catch(() => {});

  return {
    success: true,
    reviewedCardId: existingCard.id,
    flashcard: updatedCard,
  };
}
