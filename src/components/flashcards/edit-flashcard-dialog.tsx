"use client";

import { editFlashcard } from "@/app/actions/flashcards";
import { FlashcardDialogForm } from "@/components/flashcards/flashcard-dialog-form";
import type { EditFlashcardForm } from "@/features/flashcards/validation";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

interface EditFlashcardDialogProps {
  flashcard: Pick<FlashcardEntity, "id" | "subjectId" | "front" | "back">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
}

function getEditFlashcardFormValues(
  flashcard: Pick<FlashcardEntity, "id" | "subjectId" | "front" | "back">,
): EditFlashcardForm {
  return {
    id: flashcard.id,
    subjectId: flashcard.subjectId,
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
