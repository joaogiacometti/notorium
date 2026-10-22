"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { editFlashcard } from "@/app/actions/flashcards";
import { getEditFlashcardFormValues } from "@/components/flashcards/dialogs/edit-flashcard-form-values";
import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { FlashcardEditorDialogContent } from "@/components/flashcards/dialogs/flashcard-editor-dialog-content";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { FlashcardSourceReference } from "@/components/flashcards/shared/flashcard-source-reference";
import { loadSubjectOptions } from "@/components/shared/load-subject-options";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FlashcardSourceLink } from "@/features/flashcards/source-contract";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
} from "@/features/flashcards/validation";
import type {
  FlashcardEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";

interface EditFlashcardDialogProps {
  flashcard: Pick<FlashcardEntity, "id" | "subjectId" | "front" | "back"> & {
    source?: FlashcardSourceLink | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiEnabled: boolean;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
}

export function EditFlashcardDialog({
  flashcard,
  open,
  onOpenChange,
  aiEnabled,
  onUpdated,
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
        <FlashcardEditorDialogContent>
          <DialogHeader className="shrink-0 gap-1 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
            <DialogTitle>Edit Flashcard</DialogTitle>
            {/* New tab keeps unsaved edits and any running review session. */}
            <FlashcardSourceReference source={flashcard.source} newTab />
          </DialogHeader>
          <FlashcardDialogForm
            mode="edit"
            open={open}
            onOpenChange={dialog.handleOpenChange}
            form={form}
            formId="form-edit-flashcard"
            editorResetVersion={dialog.editorResetVersion}
            subjects={subjects}
            onSubmit={dialog.handleSubmit}
            isSubmitting={dialog.isSubmitting}
            isSaved={dialog.isSaved}
            discard={{
              open: dialog.discardDialogOpen,
              onOpenChange: dialog.setDiscardDialogOpen,
              onDiscard: dialog.handleDiscardChanges,
            }}
            aiEnabled={aiEnabled}
            duplicateFront={{
              isDuplicate: dialog.isDuplicateFront,
              message: dialog.duplicateFrontMessage,
            }}
            noDialog
          />
        </FlashcardEditorDialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={dialog.discardDialogOpen}
        onOpenChange={dialog.setDiscardDialogOpen}
        onDiscard={dialog.handleDiscardChanges}
      />
    </>
  );
}
