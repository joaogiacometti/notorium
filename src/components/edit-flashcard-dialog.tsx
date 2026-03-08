"use client";

import { editFlashcard } from "@/app/actions/flashcards";
import { FlashcardDialogForm } from "@/components/flashcard-dialog-form";
import type { FlashcardEntity } from "@/lib/api/contracts";
import type { EditFlashcardForm } from "@/lib/validations/flashcards";

interface EditFlashcardDialogProps {
  flashcard: Pick<FlashcardEntity, "id" | "front" | "back">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
}

function getEditFlashcardFormValues(
  flashcard: Pick<FlashcardEntity, "id" | "front" | "back">,
): EditFlashcardForm {
  return {
    id: flashcard.id,
    front: flashcard.front,
    back: flashcard.back,
  };
}

export function EditFlashcardDialog({
  flashcard,
  open,
  onOpenChange,
  onUpdated,
}: Readonly<EditFlashcardDialogProps>) {
  return (
    <FlashcardDialogForm
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      values={getEditFlashcardFormValues(flashcard)}
      onSubmitAction={(values) => editFlashcard(values as EditFlashcardForm)}
      onSuccess={(updatedFlashcard) => {
        if (updatedFlashcard) {
          return onUpdated?.(updatedFlashcard);
        }
      }}
    />
  );
}
