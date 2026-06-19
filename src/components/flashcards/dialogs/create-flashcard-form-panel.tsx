"use client";

import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { useCreateFlashcardForm } from "@/components/flashcards/dialogs/use-create-flashcard-form";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

interface CreateFlashcardFormPanelProps {
  aiEnabled: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
  deckId?: string;
}

/**
 * The create-flashcard form rendered without a dialog chrome, for hosting inside
 * a floating window. Reuses {@link useCreateFlashcardForm} so submit, AI back,
 * and duplicate-check behavior match the dialog exactly.
 */
export function CreateFlashcardFormPanel({
  aiEnabled,
  onOpenChange,
  onCreated,
  deckId,
}: Readonly<CreateFlashcardFormPanelProps>) {
  const { decks, form, dialog } = useCreateFlashcardForm({
    open: true,
    aiEnabled,
    onOpenChange,
    onCreated,
    deckId,
  });

  return (
    <div className="flex h-full min-h-0 flex-col [&>form]:min-h-0 [&>form]:flex-1">
      <FlashcardDialogForm
        mode="create"
        open
        onOpenChange={onOpenChange}
        trigger={null}
        form={form}
        formId="form-window-flashcard"
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
      <UnsavedChangesDialog
        open={dialog.discardDialogOpen}
        onOpenChange={dialog.setDiscardDialogOpen}
        onDiscard={dialog.handleDiscardChanges}
      />
    </div>
  );
}
