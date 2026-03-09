"use server";

import {
  type GetDueFlashcardsOptions,
  getDueFlashcardsForUser,
  getFlashcardReviewStateForUser,
  getFlashcardReviewSummaryForUser,
} from "@/features/flashcard-review/queries";
import { ensureFsrsSettings } from "@/features/flashcards/fsrs-settings";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
  FlashcardReviewSummary,
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
