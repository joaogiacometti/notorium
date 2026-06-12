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
    deckId: values.deckId,
    front: options.keepFrontAfterSubmit ? values.front : "",
    back: options.keepBackAfterSubmit ? values.back : "",
    clozeSource: options.keepFrontAfterSubmit ? values.clozeSource : "",
  };
}
