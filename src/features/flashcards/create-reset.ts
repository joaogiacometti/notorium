import type { FlashcardFormValues } from "@/features/flashcards/validation";

interface CreateFlashcardResetOptions {
  keepFrontAfterSubmit: boolean;
  keepBackAfterSubmit: boolean;
}

export function getCreateFlashcardResetValues(
  values: FlashcardFormValues,
  options: CreateFlashcardResetOptions,
): FlashcardFormValues {
  return {
    subjectId: values.subjectId,
    front: options.keepFrontAfterSubmit ? values.front : "",
    back: options.keepBackAfterSubmit ? values.back : "",
  };
}
