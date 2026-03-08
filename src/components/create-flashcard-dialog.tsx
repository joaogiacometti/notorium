"use client";

import { createFlashcard } from "@/app/actions/flashcards";
import { FlashcardDialogForm } from "@/components/flashcard-dialog-form";
import type { FlashcardEntity } from "@/lib/api/contracts";
import type { CreateFlashcardForm } from "@/lib/validations/flashcards";

interface CreateFlashcardDialogProps {
  subjectId: string;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
}

function getCreateFlashcardFormValues(subjectId: string): CreateFlashcardForm {
  return {
    subjectId,
    front: "",
    back: "",
  };
}

export function CreateFlashcardDialog({
  subjectId,
  trigger,
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreateFlashcardDialogProps>) {
  return (
    <FlashcardDialogForm
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      values={getCreateFlashcardFormValues(subjectId)}
      onSubmitAction={(values) =>
        createFlashcard(values as CreateFlashcardForm)
      }
      onSuccess={(flashcard) => {
        if (flashcard) {
          onCreated?.(flashcard);
        }
      }}
    />
  );
}
