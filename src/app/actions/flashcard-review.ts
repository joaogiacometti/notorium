"use server";

import {
  reviewFlashcardForUser,
  undoFlashcardReviewForUser,
} from "@/features/flashcard-review/mutations";
import {
  getAllFlashcardsForExam,
  getFlashcardReviewStateForUser,
} from "@/features/flashcard-review/queries";
import {
  type FlashcardExamScopeInput,
  type FlashcardReviewStateQueryInput,
  flashcardExamScopeSchema,
  flashcardReviewStateQuerySchema,
  type ReviewFlashcardForm,
  reviewFlashcardSchema,
  type UndoFlashcardReviewForm,
  undoFlashcardReviewSchema,
} from "@/features/flashcard-review/validation";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs/settings";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  ReviewFlashcardResult,
  UndoFlashcardReviewResult,
} from "@/lib/server/api-contracts";

export async function getFlashcardReviewState(
  options: FlashcardReviewStateQueryInput = {},
): Promise<FlashcardReviewState> {
  const scope = flashcardReviewStateQuerySchema.parse(options);
  const userId = await getAuthenticatedUserId();
  return getFlashcardReviewStateForUser(userId, scope);
}

export async function reviewFlashcard(
  data: ReviewFlashcardForm,
): Promise<ReviewFlashcardResult> {
  return runValidatedUserAction(
    "flashcard-review.reviewFlashcard",
    reviewFlashcardSchema,
    data,
    "flashcards.review.invalidData",
    async (userId, parsedData) => reviewFlashcardForUser(userId, parsedData),
  );
}

export async function undoFlashcardReview(
  data: UndoFlashcardReviewForm,
): Promise<UndoFlashcardReviewResult> {
  return runValidatedUserAction(
    "flashcard-review.undoFlashcardReview",
    undoFlashcardReviewSchema,
    data,
    "flashcards.review.invalidData",
    async (userId, parsedData) =>
      undoFlashcardReviewForUser(userId, parsedData),
  );
}

export async function getExamFlashcards(
  options: FlashcardExamScopeInput = {},
): Promise<FlashcardReviewEntity[]> {
  const scope = flashcardExamScopeSchema.parse(options);
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getAllFlashcardsForExam(userId, scope);
}
