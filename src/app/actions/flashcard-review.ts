"use server";

import { reviewFlashcardForUser } from "@/features/flashcard-review/mutations";
import {
  type GetDueFlashcardsOptions,
  getDueFlashcardsForUser,
  getFlashcardReviewStateForUser,
  getFlashcardReviewSummaryForUser,
} from "@/features/flashcard-review/queries";
import { revalidateFlashcardReviewSubjectPaths } from "@/features/flashcard-review/revalidation";
import {
  type ReviewFlashcardForm,
  reviewFlashcardSchema,
} from "@/features/flashcard-review/validation";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs-settings";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { parseActionInput } from "@/lib/server/action-input";
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

  const result = await reviewFlashcardForUser(userId, parsed.data);

  if (result.success) {
    revalidateFlashcardReviewSubjectPaths(result.flashcard.subjectId);
  }

  return result;
}
