import type { FlashcardFormValues } from "@/features/flashcards/validation";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

/**
 * Maps a stored flashcard into the edit form's default values.
 *
 * @example
 * getEditFlashcardFormValues(flashcard) // { id, subjectId, front, back }
 */
export function getEditFlashcardFormValues(
  flashcard: Pick<FlashcardEntity, "id" | "subjectId" | "front" | "back">,
): FlashcardFormValues {
  return {
    id: flashcard.id,
    subjectId: flashcard.subjectId ?? "",
    front: flashcard.front,
    back: flashcard.back,
  };
}
