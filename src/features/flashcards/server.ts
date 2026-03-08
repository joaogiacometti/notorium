"use server";

import {
  getFlashcardByIdForUser,
  getFlashcardsBySubjectForUser,
} from "@/features/flashcards/queries";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { ensureFsrsSettings } from "@/lib/fsrs-settings";

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
