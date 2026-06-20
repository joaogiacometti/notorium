import {
  generateFlashcardBackForUser,
  improveFlashcardBackForUser,
} from "@/features/flashcards/ai-service";
import type { GenerateFlashcardBackForm } from "@/features/flashcards/validation";
import { getSubjectRecordForUser } from "@/features/subjects/queries";
import type { GenerateFlashcardBackResult } from "@/lib/server/api-contracts";
import { actionError } from "@/lib/server/server-action-errors";

function mapAiServiceResult(
  result:
    | { success: true; back: string }
    | { success: false; errorCode: string },
): GenerateFlashcardBackResult {
  if (!result.success) {
    return actionError(result.errorCode);
  }

  return { success: true, back: result.back };
}

/**
 * Generates or improves a flashcard's back via AI, scoped to the card's
 * subject for prompt context. Returns a typed result rather than throwing.
 *
 * @example
 * await generateFlashcardBackForUserInput(userId, { subjectId, front });
 */
export async function generateFlashcardBackForUserInput(
  userId: string,
  data: GenerateFlashcardBackForm,
): Promise<GenerateFlashcardBackResult> {
  const existingSubject = await getSubjectRecordForUser(userId, data.subjectId);

  if (!existingSubject) {
    return actionError("subjects.notFound");
  }

  if (data.currentBack) {
    const result = await improveFlashcardBackForUser({
      userId,
      subjectName: existingSubject.name,
      front: data.front,
      currentBack: data.currentBack,
    });

    return mapAiServiceResult(result);
  }

  const result = await generateFlashcardBackForUser({
    userId,
    subjectName: existingSubject.name,
    front: data.front,
  });

  return mapAiServiceResult(result);
}
