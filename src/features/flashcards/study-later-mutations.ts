import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard } from "@/db/schema";
import type { SetFlashcardStudyLaterForm } from "@/features/flashcards/validation";
import type { SetFlashcardStudyLaterResult } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

export async function setFlashcardStudyLaterForUser(
  userId: string,
  data: SetFlashcardStudyLaterForm,
): Promise<SetFlashcardStudyLaterResult> {
  const updated = await getDb()
    .update(flashcard)
    .set({
      studyLaterAt: data.studyLater ? new Date() : null,
      // The mark is not a content edit: keep `updatedAt` so toggling it does
      // not reorder the manage table, which sorts by it.
      updatedAt: sql`${flashcard.updatedAt}`,
    })
    .where(and(eq(flashcard.id, data.id), eq(flashcard.userId, userId)))
    .returning({ studyLaterAt: flashcard.studyLaterAt });

  const row = updated[0];
  if (!row) {
    return actionError("flashcards.notFound");
  }

  return { success: true, studyLaterAt: row.studyLaterAt };
}
