import type { FlashcardFormValues } from "@/features/flashcards/validation";

interface CreateFlashcardResetOptions {
  keepFrontAfterSubmit: boolean;
  keepBackAfterSubmit: boolean;
}

// "Keep front" preserves the cloze source for cloze cards (its front equivalent)
// so users can rapidly author sibling notes from the same template.
export function getCreateFlashcardResetValues(
  values: FlashcardFormValues,
  options: CreateFlashcardResetOptions,
): FlashcardFormValues {
  return {
    type: values.type,
    subjectId: values.subjectId,
    front: options.keepFrontAfterSubmit ? values.front : "",
    back: options.keepBackAfterSubmit ? values.back : "",
    clozeSource: options.keepFrontAfterSubmit ? values.clozeSource : "",
    // Occlusion image and masks are not "kept" — a fresh note starts blank.
    occlusionImagePathname: "",
    occlusionRegions: [],
  };
}
