"use client";

import { CreateFlashcardForm } from "@/components/flashcards/dialogs/create-flashcard-form";
import { FlashcardEditorDialogContent } from "@/components/flashcards/dialogs/flashcard-editor-dialog-content";
import {
  type CreateFlashcardInitialCard,
  useCreateFlashcardForm,
} from "@/components/flashcards/dialogs/use-create-flashcard-form";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

interface CreateFlashcardDialogProps {
  folderId?: string;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
  /** Prefills front and back each time the dialog opens. */
  initialCard?: CreateFlashcardInitialCard;
}

export function CreateFlashcardDialog({
  folderId,
  trigger,
  open,
  onOpenChange,
  onCreated,
  initialCard,
}: Readonly<CreateFlashcardDialogProps>) {
  const { folders, form, dialog, handleCreateFolder } = useCreateFlashcardForm({
    open,
    onOpenChange,
    onCreated,
    folderId,
    initialCard,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={dialog.handleOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <FlashcardEditorDialogContent title="New flashcard">
          <CreateFlashcardForm
            open={open}
            form={form}
            formId="form-create-flashcard"
            editorResetVersion={dialog.editorResetVersion}
            folders={folders}
            onCreateFolder={handleCreateFolder}
            onSubmit={dialog.handleSubmit}
            isSubmitting={dialog.isSubmitting}
            isSaved={dialog.isSaved}
            duplicateFrontMessage={
              dialog.isDuplicateFront ? dialog.duplicateFrontMessage : null
            }
            keepOptions={{
              keepFrontAfterSubmit: dialog.keepFrontAfterSubmit,
              onKeepFrontAfterSubmitChange: dialog.setKeepFrontAfterSubmit,
              keepBackAfterSubmit: dialog.keepBackAfterSubmit,
              onKeepBackAfterSubmitChange: dialog.setKeepBackAfterSubmit,
            }}
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
