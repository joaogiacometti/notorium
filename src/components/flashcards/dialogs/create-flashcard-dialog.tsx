"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getDecks } from "@/app/actions/decks";
import { createFlashcard, generateFlashcards } from "@/app/actions/flashcards";
import { CreateModeToggle } from "@/components/flashcards/dialogs/create-mode-toggle";
import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { GenerateFlashcardsReview } from "@/components/flashcards/dialogs/generate-flashcards-review";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { DeckSelect } from "@/components/shared/deck-select";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { cleanupDiscardedEditorAttachments } from "@/features/attachments/client-cleanup";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import {
  type CreateFlashcardForm,
  createFlashcardSchema,
  type GenerateFlashcardsForm,
  generateFlashcardsSchema,
} from "@/features/flashcards/validation";
import type { DeckEntity, FlashcardEntity } from "@/lib/server/api-contracts";

type CreateMode = "single" | "ai";

interface GeneratedCard {
  front: string;
  back: string;
}

function getCreateFlashcardFormValues(
  deckId?: string | null,
): CreateFlashcardForm {
  return {
    deckId: deckId ?? "",
    front: "",
    back: "",
  };
}

function getGenerateFlashcardsFormValues(
  deckId?: string | null,
): GenerateFlashcardsForm {
  return {
    deckId: deckId ?? "",
    text: "",
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
  const [mode, setMode] = useState<CreateMode>("single");
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[] | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [discardOnCloseDialogOpen, setDiscardOnCloseDialogOpen] =
    useState(false);
  const [discardOnModeSwitchDialogOpen, setDiscardOnModeSwitchDialogOpen] =
    useState(false);
  const [decks, setDecks] = useState<DeckEntity[]>([]);
  const [isAiResourcesUploadingImage, setIsAiResourcesUploadingImage] =
    useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(
    deckId ?? null,
  );

  const singleForm = useForm<CreateFlashcardForm>({
    resolver: zodResolver(createFlashcardSchema),
    defaultValues: getCreateFlashcardFormValues(deckId),
  });

  const aiForm = useForm<GenerateFlashcardsForm>({
    resolver: zodResolver(generateFlashcardsSchema),
    defaultValues: getGenerateFlashcardsFormValues(deckId ?? null),
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
    onOpenChange: (nextOpen) => {
      if (!nextOpen) {
        if (
          mode === "ai" &&
          ((generatedCards && generatedCards.length > 0) ||
            aiForm.formState.isDirty)
        ) {
          setDiscardOnCloseDialogOpen(true);
          return;
        }
        setGeneratedCards(null);
        setMode("single");
        aiForm.reset(getGenerateFlashcardsFormValues(selectedDeckId));
      }
      onOpenChange(nextOpen);
    },
    values: getCreateFlashcardFormValues(deckId),
    form: singleForm,
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

  async function handleGenerate() {
    if (!aiEnabled) {
      return;
    }

    const isValid = await aiForm.trigger();
    if (!isValid) {
      return;
    }

    const values = aiForm.getValues();
    setIsGenerating(true);
    setGeneratedCards(null);

    const result = await generateFlashcards(values);

    setIsGenerating(false);

    if (!result.success) {
      let errorMessage = "AI service temporarily unavailable. Try again later.";
      if (result.errorCode === "flashcards.ai.notConfigured") {
        errorMessage = "AI features are not configured for this instance.";
      } else if (result.errorCode === "limits.aiFlashcardGenerationPerDay") {
        errorMessage = "Daily limit reached for AI flashcard generation.";
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
    const createdFlashcards: FlashcardEntity[] = [];

    for (const card of cards) {
      const result = await createFlashcard({
        deckId: selectedDeckId ?? "",
        front: card.front,
        back: card.back,
      });

      if (result.success) {
        createdCount++;
        createdFlashcards.push(result.flashcard);
      } else if (result.errorCode === "limits.flashcardLimit") {
        hitLimit = true;
        break;
      }
    }

    setIsCreating(false);

    for (const flashcard of createdFlashcards) {
      onCreated?.(flashcard);
    }

    if (createdCount === cards.length) {
      toast.success(
        `Created ${createdCount} flashcard${createdCount === 1 ? "" : "s"}`,
      );
      setGeneratedCards(null);
      aiForm.reset(getGenerateFlashcardsFormValues(selectedDeckId));
    } else if (hitLimit) {
      toast.error(
        `Flashcard limit reached. Created ${createdCount} of ${cards.length} flashcards.`,
      );
    } else {
      toast.error(
        `Created ${createdCount} of ${cards.length} flashcards. Some may have duplicate fronts.`,
      );
    }

    return createdCount;
  }

  function handleModeSwitch(newMode: CreateMode) {
    if (!aiEnabled) {
      return;
    }

    if (
      generatedCards &&
      generatedCards.length > 0 &&
      mode === "ai" &&
      newMode === "single"
    ) {
      setDiscardOnModeSwitchDialogOpen(true);
      return;
    }
    if (mode === "single" && newMode === "ai") {
      const currentDeckId = singleForm.getValues("deckId");
      aiForm.setValue("deckId", currentDeckId, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      setSelectedDeckId(currentDeckId ?? null);
    } else if (mode === "ai" && newMode === "single") {
      singleForm.setValue("deckId", selectedDeckId ?? "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
    setMode(newMode);
  }

  async function handleDiscardOnClose() {
    await cleanupDiscardedEditorAttachments(
      [
        aiForm.getValues().text ?? "",
        ...(generatedCards?.flatMap((card) => [card.front, card.back]) ?? []),
      ],
      [],
    );
    setGeneratedCards(null);
    setDiscardOnCloseDialogOpen(false);
    setSelectedDeckId(null);
    aiForm.reset(getGenerateFlashcardsFormValues(null));
    onOpenChange(false);
  }

  async function handleDiscardOnModeSwitch() {
    await cleanupDiscardedEditorAttachments(
      generatedCards?.flatMap((card) => [card.front, card.back]) ?? [],
      [],
    );
    setGeneratedCards(null);
    setDiscardOnModeSwitchDialogOpen(false);
    setMode("single");
    setSelectedDeckId(null);
    aiForm.reset(getGenerateFlashcardsFormValues(null));
  }

  async function handleBackToInput() {
    await cleanupDiscardedEditorAttachments(
      generatedCards?.flatMap((card) => [card.front, card.back]) ?? [],
      [],
    );
    setGeneratedCards(null);
  }

  let dialogContent: React.ReactNode;

  if (mode === "single") {
    dialogContent = (
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
        typeToggle={
          aiEnabled
            ? {
                mode: "single",
                onModeChange: handleModeSwitch as (mode: string) => void,
              }
            : undefined
        }
      />
    );
  } else if (generatedCards) {
    dialogContent = (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-5 sm:px-6">
        <p className="mb-3 text-sm text-muted-foreground">
          Review and edit generated flashcards before creating.
        </p>
        <GenerateFlashcardsReview
          cards={generatedCards}
          onCardsChange={setGeneratedCards}
          onCreate={handleCreateCards}
          onBack={handleBackToInput}
          isCreating={isCreating}
          typeToggle={{
            mode: "ai",
            onModeChange: handleModeSwitch as (mode: string) => void,
          }}
        />
      </div>
    );
  } else {
    dialogContent = (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleGenerate();
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-5 sm:px-6">
          <FieldGroup className="gap-5">
            <DeckSelect
              value={selectedDeckId}
              onChange={(value) => {
                setSelectedDeckId(value);
                aiForm.setValue("deckId", value ?? "", {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: false,
                });
              }}
              decks={decks}
              id="ai-deck"
            />
            <CreateModeToggle
              mode="ai"
              onModeChange={handleModeSwitch as (mode: string) => void}
            />
            <Field>
              <FieldLabel htmlFor="ai-text">Resources</FieldLabel>
              <TiptapEditor
                value={aiForm.watch("text")}
                onChange={(value) => aiForm.setValue("text", value)}
                placeholder="e.g. Textbook excerpts, lecture notes, or any study material..."
                id="ai-text"
                contentClassName="min-h-50 max-h-[40svh]"
                showToolbar
                imageUploadContext="flashcards"
                onImageUploadPendingChange={setIsAiResourcesUploadingImage}
              />
              {aiForm.formState.errors.text ? (
                <FieldError errors={[aiForm.formState.errors.text]} />
              ) : null}
            </Field>
          </FieldGroup>
        </div>
        <div className="shrink-0 border-t px-4 py-4 sm:px-6">
          <Button
            type="submit"
            disabled={
              isGenerating ||
              isAiResourcesUploadingImage ||
              !aiForm.watch("text") ||
              !selectedDeckId
            }
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                {isAiResourcesUploadingImage
                  ? "Uploading image..."
                  : "Generate Flashcards"}
              </>
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={dialog.handleOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
            <DialogTitle>Create Flashcard</DialogTitle>
          </DialogHeader>

          {dialogContent}
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={dialog.discardDialogOpen}
        onOpenChange={dialog.setDiscardDialogOpen}
        onDiscard={dialog.handleDiscardChanges}
      />
      <UnsavedChangesDialog
        open={discardOnCloseDialogOpen}
        onOpenChange={setDiscardOnCloseDialogOpen}
        onDiscard={handleDiscardOnClose}
      />
      <UnsavedChangesDialog
        open={discardOnModeSwitchDialogOpen}
        onOpenChange={setDiscardOnModeSwitchDialogOpen}
        onDiscard={handleDiscardOnModeSwitch}
      />
    </>
  );
}
