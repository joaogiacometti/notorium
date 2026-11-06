import type { FlashcardFormValues } from "@/features/flashcards/validation";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

/**
 * Maps a stored flashcard into the edit form's default values.
 *
 * @example
 * getEditFlashcardFormValues(flashcard) // { id, folderId, front, back }
 */
export function getEditFlashcardFormValues(
  flashcard: Pick<FlashcardEntity, "id" | "folderId" | "front" | "back">,
): FlashcardFormValues {
  return {
    id: flashcard.id,
    folderId: flashcard.folderId ?? "",
    front: flashcard.front,
    back: flashcard.back,
  };
}
