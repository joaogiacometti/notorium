"use server";

import { reviewFlashcardForUser } from "@/features/flashcard-review/mutations";
import {
  type GetDueFlashcardsOptions,
  getAllFlashcardsForExam,
  getFlashcardReviewStateForUser,
} from "@/features/flashcard-review/queries";
import {
  type ReviewFlashcardForm,
  reviewFlashcardSchema,
} from "@/features/flashcard-review/validation";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs/settings";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  ReviewFlashcardResult,
} from "@/lib/server/api-contracts";

export async function getFlashcardReviewState(
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewState> {
  const userId = await getAuthenticatedUserId();
  return getFlashcardReviewStateForUser(userId, options);
}

export async function reviewFlashcard(
  data: ReviewFlashcardForm,
): Promise<ReviewFlashcardResult> {
  return runValidatedUserAction(
    reviewFlashcardSchema,
    data,
    "flashcards.review.invalidData",
    async (userId, parsedData) => reviewFlashcardForUser(userId, parsedData),
  );
}

export async function getExamFlashcards(
  options: Pick<GetDueFlashcardsOptions, "subjectId" | "subjectIds"> = {},
): Promise<FlashcardReviewEntity[]> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getAllFlashcardsForExam(userId, options);
}
