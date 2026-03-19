import type { CreateFlashcardForm } from "@/features/flashcards/validation";

type FlashcardFormValues = CreateFlashcardForm & { id?: string };

interface FlashcardDialogSyncOptions<TValues extends FlashcardFormValues> {
  open: boolean;
  wasOpen: boolean;
  previousValues: TValues | null;
  nextValues: TValues;
}

export function haveFlashcardDialogValuesChanged<
  TValues extends FlashcardFormValues,
>(previousValues: TValues | null, nextValues: TValues) {
  if (previousValues === null) {
    return true;
  }

  return (
    previousValues.id !== nextValues.id ||
    previousValues.subjectId !== nextValues.subjectId ||
    previousValues.front !== nextValues.front ||
    previousValues.back !== nextValues.back
  );
}

export function shouldSyncFlashcardDialogValues<
  TValues extends FlashcardFormValues,
>({
  open,
  wasOpen,
  previousValues,
  nextValues,
}: FlashcardDialogSyncOptions<TValues>) {
  if (!open) {
    return false;
  }

  if (!wasOpen) {
    return true;
  }

  return haveFlashcardDialogValuesChanged(previousValues, nextValues);
}
