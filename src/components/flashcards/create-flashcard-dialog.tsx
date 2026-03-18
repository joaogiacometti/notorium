"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createFlashcard } from "@/app/actions/flashcards";
import { FlashcardDialogForm } from "@/components/flashcards/flashcard-dialog-form";
import { useFlashcardDialogState } from "@/components/flashcards/use-flashcard-dialog-state";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import {
  type CreateFlashcardForm,
  createFlashcardSchema,
} from "@/features/flashcards/validation";
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
  const values = getCreateFlashcardFormValues(subjectId ?? "");
  const form = useForm<CreateFlashcardForm>({
    resolver: zodResolver(createFlashcardSchema),
    defaultValues: values,
  });
  const dialog = useFlashcardDialogState({
    mode: "create",
    open,
    onOpenChange,
    values,
    form,
    onSubmitAction: createFlashcard,
    onSuccess: (flashcard) => {
      if (flashcard) {
        onCreated?.(flashcard);
      }
    },
    getSuccessValues: (submittedValues, keepValues) =>
      getCreateFlashcardResetValues(submittedValues, keepValues),
    closeOnSuccess: false,
  });

  return (
    <FlashcardDialogForm
      mode="create"
      open={open}
      onOpenChange={dialog.handleOpenChange}
      trigger={trigger}
      form={form}
      formId="form-create-flashcard"
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
