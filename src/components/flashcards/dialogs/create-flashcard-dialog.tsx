"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getDecks } from "@/app/actions/decks";
import { createFlashcard } from "@/app/actions/flashcards";
import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
  toCreateFlashcardPayload,
} from "@/features/flashcards/validation";
import type { DeckEntity, FlashcardEntity } from "@/lib/server/api-contracts";

function getCreateFlashcardFormValues(
  deckId?: string | null,
): FlashcardFormValues {
  return {
    type: "basic",
    deckId: deckId ?? "",
    front: "",
    back: "",
    clozeSource: "",
    occlusionImagePathname: "",
    occlusionRegions: [],
  };
}

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
  const [decks, setDecks] = useState<DeckEntity[]>([]);

  const singleForm = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: getCreateFlashcardFormValues(deckId),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    void getDecks().then((fetchedDecks) => {
      setDecks(fetchedDecks);
    });
  }, [open]);

  const dialog = useFlashcardDialogState({
    mode: "create",
    open,
    aiEnabled,
    onOpenChange,
    values: getCreateFlashcardFormValues(deckId),
    form: singleForm,
    onSubmitAction: (values) =>
      createFlashcard(toCreateFlashcardPayload(values)),
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
            form={singleForm}
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
