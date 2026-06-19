"use client";

import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { useCreateFlashcardForm } from "@/components/flashcards/dialogs/use-create-flashcard-form";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

interface CreateFlashcardDialogProps {
  deckId?: string;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
  aiEnabled: boolean;
}

export function CreateFlashcardDialog({
  deckId,
  trigger,
  open,
  onOpenChange,
  onCreated,
  aiEnabled,
}: Readonly<CreateFlashcardDialogProps>) {
  const { decks, form, dialog } = useCreateFlashcardForm({
    open,
    aiEnabled,
    onOpenChange,
    onCreated,
    deckId,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={dialog.handleOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
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
            decks={decks}
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
            createOptions={{
              keepFrontAfterSubmit: dialog.keepFrontAfterSubmit,
              onKeepFrontAfterSubmitChange: dialog.setKeepFrontAfterSubmit,
              keepBackAfterSubmit: dialog.keepBackAfterSubmit,
              onKeepBackAfterSubmitChange: dialog.setKeepBackAfterSubmit,
            }}
            noDialog
          />
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={dialog.discardDialogOpen}
        onOpenChange={dialog.setDiscardDialogOpen}
        onDiscard={dialog.handleDiscardChanges}
      />
    </>
  );
}
