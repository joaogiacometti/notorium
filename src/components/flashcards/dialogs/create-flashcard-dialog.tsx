"use client";

import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { FlashcardEditorDialogContent } from "@/components/flashcards/dialogs/flashcard-editor-dialog-content";
import {
  type CreateFlashcardInitialCard,
  useCreateFlashcardForm,
} from "@/components/flashcards/dialogs/use-create-flashcard-form";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

interface CreateFlashcardDialogProps {
  subjectId?: string;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
  aiEnabled: boolean;
  /** Prefills front and back each time the dialog opens. */
  initialCard?: CreateFlashcardInitialCard;
}

export function CreateFlashcardDialog({
  subjectId,
  trigger,
  open,
  onOpenChange,
  onCreated,
  aiEnabled,
  initialCard,
}: Readonly<CreateFlashcardDialogProps>) {
  const { subjects, form, dialog, handleCreateSubject } =
    useCreateFlashcardForm({
      open,
      onOpenChange,
      onCreated,
      subjectId,
      initialCard,
    });

  return (
    <>
      <Dialog open={open} onOpenChange={dialog.handleOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <FlashcardEditorDialogContent>
          <DialogHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
            <DialogTitle>Create Flashcard</DialogTitle>
          </DialogHeader>

          <FlashcardDialogForm
            mode="create"
            open={open}
            onOpenChange={dialog.handleOpenChange}
            trigger={null}
            form={form}
            formId="form-create-flashcard"
            editorResetVersion={dialog.editorResetVersion}
            subjects={subjects}
            onCreateSubject={handleCreateSubject}
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
            createOptions={{
              keepFrontAfterSubmit: dialog.keepFrontAfterSubmit,
              onKeepFrontAfterSubmitChange: dialog.setKeepFrontAfterSubmit,
              keepBackAfterSubmit: dialog.keepBackAfterSubmit,
              onKeepBackAfterSubmitChange: dialog.setKeepBackAfterSubmit,
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
