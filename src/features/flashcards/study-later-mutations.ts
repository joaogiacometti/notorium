import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import { getFlashcardRecordsForUser } from "@/features/flashcards/queries";
import type {
  BulkSetFlashcardsStudyLaterForm,
  SetFlashcardStudyLaterForm,
} from "@/features/flashcards/validation";
import type {
  BulkSetFlashcardsStudyLaterResult,
  SetFlashcardStudyLaterResult,
} from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

// Archived cards are out of review, so only active cards can be marked;
// clearing a mark works on any card.
function studyLaterTargetFilter(studyLater: boolean): SQL | undefined {
  return studyLater ? isNull(flashcard.archivedAt) : undefined;
}

function studyLaterValues(studyLater: boolean) {
  return {
    studyLaterAt: studyLater ? new Date() : null,
    // The mark is not a content edit: keep `updatedAt` so toggling it does
    // not reorder the manage table, which sorts by it.
    updatedAt: sql`${flashcard.updatedAt}`,
  };
}

export async function setFlashcardStudyLaterForUser(
  userId: string,
  data: SetFlashcardStudyLaterForm,
): Promise<SetFlashcardStudyLaterResult> {
  const updated = await getDb()
    .update(flashcard)
    .set(studyLaterValues(data.studyLater))
    .where(
      and(
        eq(flashcard.id, data.id),
        eq(flashcard.userId, userId),
        studyLaterTargetFilter(data.studyLater),
      ),
    )
    .returning({ studyLaterAt: flashcard.studyLaterAt });

  const row = updated[0];
  if (!row) {
    return actionError("flashcards.notFound");
  }

  return { success: true, studyLaterAt: row.studyLaterAt };
}

/**
 * Mark or clear study later on several of the user's cards at once. Marking
 * skips archived cards.
 *
 * @example
 * await bulkSetFlashcardsStudyLaterForUser(userId, { ids, studyLater: true });
 */
export async function bulkSetFlashcardsStudyLaterForUser(
  userId: string,
  data: BulkSetFlashcardsStudyLaterForm,
): Promise<BulkSetFlashcardsStudyLaterResult> {
  const existing = await getFlashcardRecordsForUser(userId, data.ids);
  if (existing.length !== data.ids.length) {
    return actionError("flashcards.notFound");
  }

  const values = studyLaterValues(data.studyLater);
  await getDb()
    .update(flashcard)
    .set(values)
    .where(
      and(
        inArray(flashcard.id, data.ids),
        eq(flashcard.userId, userId),
        studyLaterTargetFilter(data.studyLater),
      ),
    );

  return { success: true, studyLaterAt: values.studyLaterAt };
}
