import { improveFlashcardBackForUser } from "@/features/flashcards/ai-service";
import type { ImproveFlashcardBackForm } from "@/features/flashcards/validation";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import type { ImproveFlashcardBackResult } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

/**
 * Rewrites a flashcard's back via AI, scoped to the card's subject for prompt
 * context. Returns a typed result rather than throwing.
 *
 * @example
 * await improveFlashcardBackForUserInput(userId, { subjectId, front, currentBack });
 */
export async function improveFlashcardBackForUserInput(
  userId: string,
  data: ImproveFlashcardBackForm,
): Promise<ImproveFlashcardBackResult> {
  const existingSubject = await getSubjectRecordForUser(userId, data.subjectId);

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  const result = await improveFlashcardBackForUser({
    userId,
    subjectName: existingSubject.name,
    front: data.front,
    currentBack: data.currentBack,
  });

  return result.success ? result : actionError(result.errorCode);
}
