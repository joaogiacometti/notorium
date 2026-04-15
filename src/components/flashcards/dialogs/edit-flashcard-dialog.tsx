"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getDecks } from "@/app/actions/decks";
import {
  createFlashcard,
  deleteFlashcard,
  editFlashcard,
  generateFlashcards,
} from "@/app/actions/flashcards";
import { CreateModeToggle } from "@/components/flashcards/dialogs/create-mode-toggle";
import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { GenerateFlashcardsReview } from "@/components/flashcards/dialogs/generate-flashcards-review";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { DeckSelect } from "@/components/shared/deck-select";
import { cleanupDiscardedEditorAttachments } from "@/components/shared/editor-attachment-cleanup";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  type EditFlashcardForm,
  editFlashcardSchema,
} from "@/features/flashcards/validation";
import { richTextToPlainText } from "@/lib/editor/rich-text";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import type { DeckEntity, FlashcardEntity } from "@/lib/server/api-contracts";

type EditMode = "edit" | "split";

const modeOptions: Array<{ value: string; label: string }> = [
  { value: "edit", label: "Edit" },
  { value: "split", label: "Split" },
];

interface GeneratedCard {
  front: string;
  back: string;
}

interface EditFlashcardDialogProps {
  flashcard: Pick<FlashcardEntity, "id" | "deckId" | "front" | "back">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
  onDeleted?: (deletedId: string) => void | Promise<void>;
  className?: string;
  overlayClassName?: string;
}

export function EditFlashcardDialog({
  flashcard,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  className,
  overlayClassName,
}: Readonly<EditFlashcardDialogProps>) {
  const [mode, setMode] = useState<EditMode>("edit");
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[] | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [discardOnModeSwitchDialogOpen, setDiscardOnModeSwitchDialogOpen] =
    useState(false);
  const [discardOnCloseDialogOpen, setDiscardOnCloseDialogOpen] =
    useState(false);
  const [splitDeckId, setSplitDeckId] = useState<string | null>(
    flashcard.deckId ?? null,
  );
  const [splitFront, setSplitFront] = useState(flashcard.front);
  const [splitBack, setSplitBack] = useState(flashcard.back);
  const [decks, setDecks] = useState<DeckEntity[]>([]);
  const [_splitDecks, setSplitDecks] = useState<DeckEntity[]>([]);
  const [splitEditorPendingUploads, setSplitEditorPendingUploads] = useState(0);

  const isSplitDirty =
    splitFront !== flashcard.front || splitBack !== flashcard.back;

  const incomingValues = getEditFlashcardFormValues(flashcard);

  const form = useForm<EditFlashcardForm>({
    resolver: zodResolver(editFlashcardSchema),
    defaultValues: incomingValues,
  });

  useEffect(() => {
    if (open) {
      void getDecks().then((fetchedDecks) => {
        setDecks(fetchedDecks);
        setSplitDecks(fetchedDecks);
      });
    }
  }, [open]);

  const dialog = useFlashcardDialogState({
    mode: "edit",
    open,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) {
        setGeneratedCards(null);
        setMode("edit");
        setSplitFront(flashcard.front);
        setSplitBack(flashcard.back);
        setSplitDeckId(flashcard.deckId ?? null);
      }
      onOpenChange(nextOpen);
    },
    values: incomingValues,
    form,
    onSubmitAction: editFlashcard,
    onSuccess: handleFlashcardUpdated,
    getSuccessValues: (submittedValues) => submittedValues,
    closeOnSuccess: false,
  });

  function _handleDialogClose(nextOpen: boolean) {
    if (!nextOpen) {
      resetSplitState();
    }
    onOpenChange(nextOpen);
  }

  function handleFlashcardUpdated(
    updatedFlashcard: FlashcardEntity | undefined,
  ) {
    if (updatedFlashcard) {
      return onUpdated?.(updatedFlashcard);
    }
  }

  function resetSplitState() {
    setGeneratedCards(null);
    setMode("edit");
    setSplitFront(flashcard.front);
    setSplitBack(flashcard.back);
    setSplitDeckId(flashcard.deckId ?? null);
  }

  function handleSplitEditorUploadPendingChange(pending: boolean) {
    setSplitEditorPendingUploads((current) => {
      if (pending) {
        return current + 1;
      }

      return Math.max(0, current - 1);
    });
  }

  useBeforeUnload(
    open && mode === "split" && isSplitDirty && !isGenerating && !isCreating,
  );

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      dialog.handleOpenChange(true);
      return;
    }
    if (mode === "split" && isSplitDirty && !isGenerating && !isCreating) {
      setDiscardOnCloseDialogOpen(true);
      return;
    }
    dialog.handleOpenChange(false);
  }

  async function handleDiscardOnClose() {
    await cleanupDiscardedEditorAttachments(
      [
        splitFront,
        splitBack,
        ...(generatedCards?.flatMap((card) => [card.front, card.back]) ?? []),
      ],
      [flashcard.front, flashcard.back],
    );
    setDiscardOnCloseDialogOpen(false);
    resetSplitState();
    onOpenChange(false);
  }

  async function handleGenerate() {
    const combinedText = `Front:\n${richTextToPlainText(splitFront)}\n\nBack:\n${richTextToPlainText(splitBack)}`;

    setIsGenerating(true);
    setGeneratedCards(null);

    const result = await generateFlashcards({
      deckId: splitDeckId ?? "",
      text: combinedText,
    });

    setIsGenerating(false);

    if (!result.success) {
      let errorMessage = "AI service temporarily unavailable. Try again later.";
      if (result.errorCode === "flashcards.ai.notConfigured") {
        errorMessage =
          "Configure your AI settings in Account to use this feature.";
      } else if (result.errorCode === "flashcards.ai.emptyGeneration") {
        errorMessage =
          "Could not extract flashcards from this text. Try adding more content.";
      }

      toast.error(errorMessage);
      return;
    }

    setGeneratedCards(result.cards);
  }

  async function handleCreateCards(cards: GeneratedCard[]): Promise<number> {
    setIsCreating(true);

    let createdCount = 0;
    let hitLimit = false;

    for (const card of cards) {
      const result = await createFlashcard({
        deckId: splitDeckId ?? "",
        front: card.front,
        back: card.back,
      });

      if (result.success) {
        createdCount++;
      } else if (result.errorCode === "limits.flashcardLimit") {
        hitLimit = true;
        break;
      }
    }

    setIsCreating(false);

    if (createdCount > 0) {
      toast.success(
        `Created ${createdCount} split flashcard${createdCount === 1 ? "" : "s"}`,
      );
      await deleteFlashcard({ id: flashcard.id });
      onOpenChange(false);
      onDeleted?.(flashcard.id);
    } else if (hitLimit) {
      toast.error("Flashcard limit reached. Could not split.");
    } else {
      toast.error("Failed to split flashcard. Some may have duplicate fronts.");
    }

    return createdCount;
  }

  function handleModeSwitch(newMode: EditMode) {
    if (
      generatedCards &&
      generatedCards.length > 0 &&
      mode === "split" &&
      newMode === "edit"
    ) {
      setDiscardOnModeSwitchDialogOpen(true);
      return;
    }
    if (mode === "edit" && newMode === "split") {
      setSplitFront(form.getValues("front"));
      setSplitBack(form.getValues("back"));
      setSplitDeckId(form.getValues("deckId") ?? flashcard.deckId ?? null);
    } else if (mode === "split" && newMode === "edit") {
      form.setValue("front", splitFront, { shouldDirty: true });
      form.setValue("back", splitBack, { shouldDirty: true });
      form.setValue("deckId", splitDeckId ?? "");
    }
    setMode(newMode);
  }

  async function handleDiscardOnModeSwitch() {
    await cleanupDiscardedEditorAttachments(
      [
        splitFront,
        splitBack,
        ...(generatedCards?.flatMap((card) => [card.front, card.back]) ?? []),
      ],
      [flashcard.front, flashcard.back],
    );
    setGeneratedCards(null);
    setDiscardOnModeSwitchDialogOpen(false);
    setMode("edit");
  }

  async function handleBackToInput() {
    await cleanupDiscardedEditorAttachments(
      generatedCards?.flatMap((card) => [card.front, card.back]) ?? [],
      [],
    );
    setGeneratedCards(null);
  }

  function handleFormSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    void handleGenerate();
  }

  function renderContent() {
    if (mode === "edit") {
      return (
        <FlashcardDialogForm
          mode="edit"
          open={open}
          onOpenChange={dialog.handleOpenChange}
          form={form}
          formId="form-edit-flashcard"
          decks={decks}
          onSubmit={dialog.handleSubmit}
          isSubmitting={dialog.isSubmitting}
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
          duplicateFront={{
            isChecking: dialog.isCheckingDuplicateFront,
            isDuplicate: dialog.isDuplicateFront,
            message: dialog.duplicateFrontMessage,
          }}
          noDialog
          typeToggle={{
            mode: "edit",
            onModeChange: (m) => handleModeSwitch(m as EditMode),
            options: modeOptions,
          }}
        />
      );
    }

    if (generatedCards) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-5 sm:px-6">
          <p className="mb-3 text-sm text-muted-foreground">
            Review and edit split flashcards before replacing the original.
          </p>
          <GenerateFlashcardsReview
            cards={generatedCards}
            onCardsChange={setGeneratedCards}
            onCreate={handleCreateCards}
            onBack={handleBackToInput}
            isCreating={isCreating}
            typeToggle={{
              mode: "split",
              onModeChange: (m) => handleModeSwitch(m as EditMode),
              options: modeOptions,
            }}
          />
        </div>
      );
    }

    const hasFrontContent = splitFront.trim().length > 0;
    const hasBackContent = splitBack.trim().length > 0;
    const isSplitImageUploading = splitEditorPendingUploads > 0;

    return (
      <form
        onSubmit={handleFormSubmit}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-5 sm:px-6">
          <FieldGroup className="gap-5">
            <DeckSelect
              value={splitDeckId}
              onChange={setSplitDeckId}
              decks={decks}
              id="split-deck"
            />
            <CreateModeToggle
              mode="split"
              onModeChange={(m) => handleModeSwitch(m as EditMode)}
              options={modeOptions}
            />
            <Field>
              <div className="flex h-9 items-center justify-between gap-3">
                <FieldLabel htmlFor="split-front">Front</FieldLabel>
              </div>
              <TiptapEditor
                value={splitFront}
                onChange={setSplitFront}
                placeholder="e.g. What is photosynthesis?"
                id="split-front"
                contentClassName="min-h-11 max-h-[40svh]"
                showToolbar={false}
                imageUploadContext="flashcards"
                onImageUploadPendingChange={
                  handleSplitEditorUploadPendingChange
                }
              />
            </Field>
            <Field>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="split-back">Back</FieldLabel>
                </div>
              </div>
              <TiptapEditor
                value={splitBack}
                onChange={setSplitBack}
                placeholder="e.g. Process plants use to convert light into energy."
                id="split-back"
                contentClassName="max-h-[10lh]"
                showToolbar
                imageUploadContext="flashcards"
                onImageUploadPendingChange={
                  handleSplitEditorUploadPendingChange
                }
              />
            </Field>
          </FieldGroup>
        </div>
        <div className="shrink-0 border-t px-4 py-4 sm:px-6">
          <Button
            type="submit"
            disabled={
              isGenerating ||
              isSplitImageUploading ||
              !hasFrontContent ||
              !hasBackContent ||
              !splitDeckId
            }
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Splitting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                {isSplitImageUploading
                  ? "Uploading image..."
                  : "Split Flashcard"}
              </>
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={`flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl ${className ?? ""}`}
          overlayClassName={overlayClassName}
        >
          <DialogHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
            <DialogTitle>Edit Flashcard</DialogTitle>
          </DialogHeader>

          {renderContent()}
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={discardOnModeSwitchDialogOpen}
        onOpenChange={setDiscardOnModeSwitchDialogOpen}
        onDiscard={handleDiscardOnModeSwitch}
      />
      <UnsavedChangesDialog
        open={discardOnCloseDialogOpen}
        onOpenChange={setDiscardOnCloseDialogOpen}
        onDiscard={handleDiscardOnClose}
      />
    </>
  );
}

function getEditFlashcardFormValues(
  flashcard: Pick<FlashcardEntity, "id" | "deckId" | "front" | "back">,
): EditFlashcardForm {
  return {
    id: flashcard.id,
    deckId: flashcard.deckId,
    front: flashcard.front,
    back: flashcard.back,
  };
}
