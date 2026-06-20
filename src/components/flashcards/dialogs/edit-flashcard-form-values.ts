import type { FlashcardFormValues } from "@/features/flashcards/validation";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

/**
 * Maps a stored flashcard into the edit form's default values. Cloze and
 * occlusion cards derive their front/back from a source, so those fields start
 * empty and the source/regions fields carry the editable content instead.
 *
 * @example
 * getEditFlashcardFormValues(flashcard) // { type, subjectId, front, back, ... }
 */
export function getEditFlashcardFormValues(
  flashcard: Pick<
    FlashcardEntity,
    | "id"
    | "subjectId"
    | "front"
    | "back"
    | "type"
    | "clozeSource"
    | "occlusionImagePathname"
    | "occlusionRegions"
  >,
): FlashcardFormValues {
  const isCloze = flashcard.type === "cloze";
  const isOcclusion = flashcard.type === "occlusion";
  return {
    id: flashcard.id,
    type: isOcclusion ? "occlusion" : isCloze ? "cloze" : "basic",
    subjectId: flashcard.subjectId ?? "",
    // Cloze and occlusion cards edit their source; front/back are derived.
    front: isCloze || isOcclusion ? "" : flashcard.front,
    back: isCloze || isOcclusion ? "" : flashcard.back,
    clozeSource: flashcard.clozeSource ?? "",
    occlusionImagePathname: flashcard.occlusionImagePathname ?? "",
    occlusionRegions: flashcard.occlusionRegions ?? [],
  };
}
