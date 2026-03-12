"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { editFlashcard } from "@/app/actions/flashcards";
import { FlashcardDialogForm } from "@/components/flashcards/flashcard-dialog-form";
import type { EditFlashcardForm } from "@/features/flashcards/validation";
import type {
  FlashcardEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

interface EditFlashcardDialogProps {
  flashcard: Pick<FlashcardEntity, "id" | "subjectId" | "front" | "back">;
  subjects?: SubjectEntity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
}

export function EditFlashcardDialog({
  flashcard,
  subjects,
  open,
  onOpenChange,
  onUpdated,
}: Readonly<EditFlashcardDialogProps>) {
  const incomingValues = useMemo(
    () => ({
      id: flashcard.id,
      subjectId: flashcard.subjectId,
      front: flashcard.front,
      back: flashcard.back,
    }),
    [flashcard.back, flashcard.front, flashcard.id, flashcard.subjectId],
  );
  const [sessionValues, setSessionValues] = useState<EditFlashcardForm>(
    () => incomingValues,
  );
  const previousOpenRef = useRef(false);

  useEffect(() => {
    const openedNow = open && !previousOpenRef.current;
    const changedFlashcard = incomingValues.id !== sessionValues.id;

    if (openedNow || (open && changedFlashcard)) {
      setSessionValues(incomingValues);
    }

    previousOpenRef.current = open;
  }, [incomingValues, open, sessionValues.id]);

  return (
    <FlashcardDialogForm
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      values={sessionValues}
      subjects={subjects}
      onSubmitAction={(values) => editFlashcard(values as EditFlashcardForm)}
      onSuccess={(updatedFlashcard) => {
        if (updatedFlashcard) {
          return onUpdated?.(updatedFlashcard);
        }
      }}
    />
  );
}
