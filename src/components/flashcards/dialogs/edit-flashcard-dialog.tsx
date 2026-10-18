"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { editFlashcard } from "@/app/actions/flashcards";
import { getEditFlashcardFormValues } from "@/components/flashcards/dialogs/edit-flashcard-form-values";
import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { loadSubjectOptions } from "@/components/shared/load-subject-options";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
} from "@/features/flashcards/validation";
import type {
  FlashcardEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface EditFlashcardDialogProps {
  flashcard: Pick<FlashcardEntity, "id" | "subjectId" | "front" | "back">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiEnabled: boolean;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
  className?: string;
  overlayClassName?: string;
}

export function EditFlashcardDialog({
  flashcard,
  open,
  onOpenChange,
  aiEnabled,
  onUpdated,
  className,
  overlayClassName,
}: Readonly<EditFlashcardDialogProps>) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const incomingValues = getEditFlashcardFormValues(flashcard);

  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: incomingValues,
  });

  useEffect(() => {
    if (open) {
      void loadSubjectOptions().then((fetchedSubjects) => {
        if (!fetchedSubjects) {
          return;
        }
        setSubjects(fetchedSubjects);
      });
    }
  }, [open]);

  const dialog = useFlashcardDialogState({
    mode: "edit",
    open,
    aiEnabled,
    onOpenChange,
    values: incomingValues,
    form,
    onSubmitAction: (values) => editFlashcard({ ...values, id: flashcard.id }),
    onSuccess: handleFlashcardUpdated,
    getSuccessValues: (submittedValues) => submittedValues,
    closeOnSuccess: false,
  });

  function handleFlashcardUpdated(
    updatedFlashcard: FlashcardEntity | undefined,
  ) {
    if (updatedFlashcard) {
      return onUpdated?.(updatedFlashcard);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={dialog.handleOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl",
            className,
          )}
          overlayClassName={overlayClassName}
        >
          <DialogHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
            <DialogTitle>Edit Flashcard</DialogTitle>
          </DialogHeader>
          <FlashcardDialogForm
            mode="edit"
            open={open}
            onOpenChange={dialog.handleOpenChange}
            form={form}
            formId="form-edit-flashcard"
            subjects={subjects}
            onSubmit={dialog.handleSubmit}
            isSubmitting={dialog.isSubmitting}
            isSaved={dialog.isSaved}
            discard={{
              open: dialog.discardDialogOpen,
              onOpenChange: dialog.setDiscardDialogOpen,
              onDiscard: dialog.handleDiscardChanges,
            }}
            aiBack={{
              isGenerating: dialog.isGeneratingBack,
              canUse: dialog.canUseAiBack,
              onGenerate: dialog.handleGenerateBack,
              previousValue: dialog.previousBack,
              proposedValue: dialog.proposedBack,
              onAccept: dialog.handleAcceptBack,
              onReject: dialog.handleRejectBack,
            }}
            aiEnabled={aiEnabled}
            duplicateFront={{
              isChecking: dialog.isCheckingDuplicateFront,
              isDuplicate: dialog.isDuplicateFront,
              message: dialog.duplicateFrontMessage,
            }}
            noDialog
          />
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={dialog.discardDialogOpen}
        onOpenChange={dialog.setDiscardDialogOpen}
        onDiscard={dialog.handleDiscardChanges}
        className={className}
        overlayClassName={overlayClassName}
      />
    </>
  );
}
