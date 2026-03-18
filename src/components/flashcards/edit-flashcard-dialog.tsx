"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { editFlashcard } from "@/app/actions/flashcards";
import { FlashcardDialogForm } from "@/components/flashcards/flashcard-dialog-form";
import { useFlashcardDialogState } from "@/components/flashcards/use-flashcard-dialog-state";
import {
  type EditFlashcardForm,
  editFlashcardSchema,
} from "@/features/flashcards/validation";
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
  const incomingValues = getEditFlashcardFormValues(flashcard);
  const [sessionValues, setSessionValues] = useState<EditFlashcardForm>(
    () => incomingValues,
  );
  const previousOpenRef = useRef(false);
  const form = useForm<EditFlashcardForm>({
    resolver: zodResolver(editFlashcardSchema),
    defaultValues: sessionValues,
  });

  useEffect(() => {
    const openedNow = open && !previousOpenRef.current;
    const changedFlashcard = incomingValues.id !== sessionValues.id;

    if (openedNow || (open && changedFlashcard)) {
      setSessionValues(incomingValues);
    }

    previousOpenRef.current = open;
  }, [incomingValues, open, sessionValues.id]);

  const dialog = useFlashcardDialogState({
    mode: "edit",
    open,
    onOpenChange,
    values: sessionValues,
    form,
    onSubmitAction: editFlashcard,
    onSuccess: (updatedFlashcard) => {
      if (updatedFlashcard) {
        return onUpdated?.(updatedFlashcard);
      }
    },
    getSuccessValues: (submittedValues) => submittedValues,
    closeOnSuccess: true,
  });

  return (
    <FlashcardDialogForm
      mode="edit"
      open={open}
      onOpenChange={dialog.handleOpenChange}
      form={form}
      formId="form-edit-flashcard"
      subjects={subjects}
      onSubmit={dialog.handleSubmit}
      discardDialogOpen={dialog.discardDialogOpen}
      onDiscardDialogOpenChange={dialog.setDiscardDialogOpen}
      onDiscard={dialog.handleDiscardChanges}
      isGeneratingBack={dialog.isGeneratingBack}
      canGenerateBack={dialog.canGenerateBack}
      onGenerateBack={dialog.handleGenerateBack}
      keepFrontAfterSubmit={dialog.keepFrontAfterSubmit}
      onKeepFrontAfterSubmitChange={dialog.setKeepFrontAfterSubmit}
      keepBackAfterSubmit={dialog.keepBackAfterSubmit}
      onKeepBackAfterSubmitChange={dialog.setKeepBackAfterSubmit}
      isCheckingDuplicateFront={dialog.isCheckingDuplicateFront}
      isDuplicateFront={dialog.isDuplicateFront}
      duplicateFrontMessage={dialog.duplicateFrontMessage}
    />
  );
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
