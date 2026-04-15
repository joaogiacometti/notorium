"use server";

import { reviewFlashcardForUser } from "@/features/flashcard-review/mutations";
import {
  type GetDueFlashcardsOptions,
  getAllFlashcardsForExam,
  getDueFlashcardsForUser,
  getFlashcardReviewStateForUser,
  getFlashcardReviewSummaryForUser,
} from "@/features/flashcard-review/queries";
import {
  type ReviewFlashcardForm,
  reviewFlashcardSchema,
} from "@/features/flashcard-review/validation";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs-settings";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
  ReviewFlashcardResult,
} from "@/lib/server/api-contracts";

export async function getDueFlashcards(
  options: GetDueFlashcardsOptions = {},
): Promise<FlashcardReviewEntity[]> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getDueFlashcardsForUser(userId, new Date(), options);
}

export async function getFlashcardReviewSummary(
  options: Pick<GetDueFlashcardsOptions, "deckId" | "deckIds"> = {},
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
  return runValidatedUserAction(
    reviewFlashcardSchema,
    data,
    "flashcards.review.invalidData",
    async (userId, parsedData) => reviewFlashcardForUser(userId, parsedData),
  );
}

export async function getExamFlashcards(
  options: Pick<GetDueFlashcardsOptions, "deckId" | "deckIds"> = {},
): Promise<FlashcardReviewEntity[]> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getAllFlashcardsForExam(userId, options);
}
