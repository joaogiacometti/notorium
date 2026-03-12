"use client";

import { useMemo } from "react";
import { createFlashcard } from "@/app/actions/flashcards";
import { FlashcardDialogForm } from "@/components/flashcards/flashcard-dialog-form";
import type { CreateFlashcardForm } from "@/features/flashcards/validation";
import type {
  FlashcardEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

interface CreateFlashcardDialogProps {
  subjectId?: string;
  subjects?: SubjectEntity[];
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
  subjects,
  trigger,
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreateFlashcardDialogProps>) {
  const values = useMemo(
    () => getCreateFlashcardFormValues(subjectId ?? ""),
    [subjectId],
  );

  return (
    <FlashcardDialogForm
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      values={values}
      subjects={subjects}
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
