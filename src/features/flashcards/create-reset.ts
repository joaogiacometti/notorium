import type { CreateFlashcardForm } from "@/features/flashcards/validation";

interface CreateFlashcardResetOptions {
  keepFrontAfterSubmit: boolean;
  keepBackAfterSubmit: boolean;
}

export function getCreateFlashcardResetValues(
  values: CreateFlashcardForm,
  options: CreateFlashcardResetOptions,
): CreateFlashcardForm {
  return {
    subjectId: values.subjectId,
    deckId: values.deckId,
    front: options.keepFrontAfterSubmit ? values.front : "",
    back: options.keepBackAfterSubmit ? values.back : "",
  };
}
