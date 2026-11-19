import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { getFlashcardRecordsForUser } from "@/features/flashcards/queries";
import type { SetFlashcardsArchivedForm } from "@/features/flashcards/validation";
import type { SetFlashcardsArchivedResult } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

/**
 * Archive or unarchive the user's cards. Archiving takes a card out of review
 * without touching its content, history, or scheduling state, and clears its
 * study-later mark, which only orders cards inside review.
 *
 * @example
 * await setFlashcardsArchivedForUser(userId, { ids: [id], archived: true });
 */
export async function setFlashcardsArchivedForUser(
  userId: string,
  data: SetFlashcardsArchivedForm,
): Promise<SetFlashcardsArchivedResult> {
  const existing = await getFlashcardRecordsForUser(userId, data.ids);
  if (existing.length !== data.ids.length) {
    return actionError("flashcards.notFound");
  }

  const archivedAt = data.archived ? new Date() : null;
  await getDb()
    .update(flashcard)
    .set({
      archivedAt,
      ...(data.archived ? { studyLaterAt: null } : {}),
      // Archiving is not a content edit: keep `updatedAt` so it does not
      // reorder the manage table, which sorts by it.
      updatedAt: sql`${flashcard.updatedAt}`,
    })
    .where(and(inArray(flashcard.id, data.ids), eq(flashcard.userId, userId)));

  return { success: true, archivedAt };
}
