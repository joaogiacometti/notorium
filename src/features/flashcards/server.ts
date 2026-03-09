"use server";

import { ensureFsrsSettings } from "@/features/flashcards/fsrs-settings";
import {
  getFlashcardByIdForUser,
  getFlashcardsBySubjectForUser,
} from "@/features/flashcards/queries";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

export async function getFlashcardsBySubject(
  subjectId: string,
): Promise<FlashcardEntity[]> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getFlashcardsBySubjectForUser(userId, subjectId);
}

export async function getFlashcardById(
  id: string,
): Promise<FlashcardEntity | null> {
  const userId = await getAuthenticatedUserId();
  await ensureFsrsSettings(userId);
  return getFlashcardByIdForUser(userId, id);
}
