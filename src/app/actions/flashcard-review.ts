"use server";

import {
  reviewFlashcardForUser,
  undoFlashcardReviewForUser,
} from "@/features/flashcard-review/mutations";
import {
  type ReviewFlashcardForm,
  reviewFlashcardSchema,
  type UndoFlashcardReviewForm,
  undoFlashcardReviewSchema,
} from "@/features/flashcard-review/validation";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  ReviewFlashcardResult,
  UndoFlashcardReviewResult,
} from "@/lib/server/api-contracts";

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
