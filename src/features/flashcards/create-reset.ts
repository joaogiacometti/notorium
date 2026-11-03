import type { FlashcardFormValues } from "@/features/flashcards/validation";
import { emptyDocument } from "@/lib/editor/document";

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
    front: options.keepFrontAfterSubmit ? values.front : emptyDocument(),
    back: options.keepBackAfterSubmit ? values.back : emptyDocument(),
  };
}
