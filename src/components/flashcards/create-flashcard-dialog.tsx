"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getDecks } from "@/app/actions/decks";
import { createFlashcard, generateFlashcards } from "@/app/actions/flashcards";
import { CreateModeToggle } from "@/components/flashcards/create-mode-toggle";
import { FlashcardDialogForm } from "@/components/flashcards/flashcard-dialog-form";
import { GenerateFlashcardsReview } from "@/components/flashcards/generate-flashcards-review";
import { useFlashcardDialogState } from "@/components/flashcards/use-flashcard-dialog-state";
import { DeckSelect } from "@/components/shared/deck-select";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { SubjectSelect } from "@/components/shared/subject-select";
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
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import {
  type CreateFlashcardForm,
  createFlashcardSchema,
  type GenerateFlashcardsForm,
  generateFlashcardsSchema,
} from "@/features/flashcards/validation";
import type {
  DeckEntity,
  FlashcardEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

type CreateMode = "single" | "ai";

interface GeneratedCard {
  front: string;
  back: string;
}

function getDeckValueForSubject(
  decks: DeckEntity[],
  deckId: string | null | undefined,
  propDeckId?: string | null,
): string | undefined {
  if (propDeckId && decks.some((deck) => deck.id === propDeckId)) {
    return propDeckId;
  }
  if (deckId && decks.some((deck) => deck.id === deckId)) {
    return deckId;
  }
  return decks.find((deck) => deck.isDefault)?.id;
}

function getCreateFlashcardFormValues(
  subjectId: string,
  deckId?: string | null,
): CreateFlashcardForm {
  return {
    subjectId,
    deckId: deckId ?? undefined,
    front: "",
    back: "",
  };
}

function getGenerateFlashcardsFormValues(
  subjectId: string,
  deckId?: string | null,
): GenerateFlashcardsForm {
  return {
    subjectId,
    deckId: deckId ?? undefined,
    text: "",
  };
}

interface CreateFlashcardDialogProps {
  subjectId?: string;
  deckId?: string;
  subjects?: SubjectEntity[];
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
}

export function CreateFlashcardDialog({
  subjectId,
  deckId,
  subjects,
  trigger,
  open,
  onOpenChange,
  onCreated,
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
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(
    deckId ?? null,
  );

  const singleForm = useForm<CreateFlashcardForm>({
    resolver: zodResolver(createFlashcardSchema),
    defaultValues: getCreateFlashcardFormValues(subjectId ?? "", deckId),
  });

  const aiForm = useForm<GenerateFlashcardsForm>({
    resolver: zodResolver(generateFlashcardsSchema),
    defaultValues: getGenerateFlashcardsFormValues(
      subjectId ?? "",
      deckId ?? null,
    ),
  });
  const watchedSingleSubjectId = singleForm.watch("subjectId");

  useEffect(() => {
    const currentSubjectId = watchedSingleSubjectId;

    if (!currentSubjectId) {
      setDecks([]);
      singleForm.setValue("deckId", undefined);
      setSelectedDeckId(null);
      return;
    }

    let active = true;

    void getDecks(currentSubjectId).then((fetchedDecks) => {
      if (!active) {
        return;
      }

      setDecks(fetchedDecks);
      const currentDeckId = singleForm.getValues("deckId");
      const nextDeckId = getDeckValueForSubject(
        fetchedDecks,
        currentDeckId,
        deckId,
      );
      singleForm.setValue("deckId", nextDeckId);
      setSelectedDeckId(nextDeckId ?? null);
    });

    return () => {
      active = false;
    };
  }, [singleForm, watchedSingleSubjectId, deckId]);

  useEffect(() => {
    if (!subjectId) {
      return;
    }

    singleForm.setValue("subjectId", subjectId, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    aiForm.setValue("subjectId", subjectId, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [aiForm.setValue, singleForm.setValue, subjectId]);

  const dialog = useFlashcardDialogState({
    mode: "create",
    open,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) {
        if (
          (generatedCards && generatedCards.length > 0) ||
          aiForm.formState.isDirty
        ) {
          setDiscardOnCloseDialogOpen(true);
          return;
        }
        setGeneratedCards(null);
        setMode("single");
        aiForm.reset(
          getGenerateFlashcardsFormValues(subjectId ?? "", selectedDeckId),
        );
      }
      onOpenChange(nextOpen);
    },
    values: getCreateFlashcardFormValues(subjectId ?? "", deckId),
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
    const createdFlashcards: FlashcardEntity[] = [];

    for (const card of cards) {
      const result = await createFlashcard({
        subjectId: aiForm.getValues().subjectId,
        deckId: selectedDeckId ?? undefined,
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
      aiForm.reset(
        getGenerateFlashcardsFormValues(
          aiForm.getValues().subjectId,
          selectedDeckId,
        ),
      );
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
      const currentSubjectId = singleForm.getValues("subjectId");
      aiForm.setValue("subjectId", currentSubjectId, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      aiForm.setValue("deckId", singleForm.getValues("deckId") ?? null, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      setSelectedDeckId(singleForm.getValues("deckId") ?? null);
    } else if (mode === "ai" && newMode === "single") {
      const currentSubjectId = aiForm.getValues("subjectId");
      singleForm.setValue("subjectId", currentSubjectId, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      singleForm.setValue("deckId", selectedDeckId ?? undefined, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
    setMode(newMode);
  }

  function handleSubjectChange(newSubjectId: string) {
    singleForm.setValue("deckId", undefined, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    setSelectedDeckId(null);
    aiForm.setValue("deckId", null, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    aiForm.setValue("subjectId", newSubjectId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleAiSubjectChange(newSubjectId: string) {
    aiForm.setValue("subjectId", newSubjectId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    singleForm.setValue("subjectId", newSubjectId, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    singleForm.setValue("deckId", undefined, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    setSelectedDeckId(null);
    aiForm.setValue("deckId", null, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  }

  function handleDiscardOnClose() {
    setGeneratedCards(null);
    setDiscardOnCloseDialogOpen(false);
    setSelectedDeckId(null);
    aiForm.reset(getGenerateFlashcardsFormValues(subjectId ?? "", null));
    onOpenChange(false);
  }

  function handleDiscardOnModeSwitch() {
    setGeneratedCards(null);
    setDiscardOnModeSwitchDialogOpen(false);
    setMode("single");
    setSelectedDeckId(null);
    aiForm.reset(getGenerateFlashcardsFormValues(subjectId ?? "", null));
  }

  function handleBackToInput() {
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
        subjects={subjects}
        decks={decks}
        onSubjectChange={handleSubjectChange}
        onSubmit={dialog.handleSubmit}
        discardDialogOpen={dialog.discardDialogOpen}
        onDiscardDialogOpenChange={dialog.setDiscardDialogOpen}
        onDiscard={dialog.handleDiscardChanges}
        isGeneratingBack={dialog.isGeneratingBack}
        isSubmitting={dialog.isSubmitting}
        canUseAiBack={dialog.canUseAiBack}
        onGenerateBack={dialog.handleGenerateBack}
        previousBack={dialog.previousBack}
        proposedBack={dialog.proposedBack}
        onAcceptBack={dialog.handleAcceptBack}
        onRejectBack={dialog.handleRejectBack}
        keepFrontAfterSubmit={dialog.keepFrontAfterSubmit}
        onKeepFrontAfterSubmitChange={dialog.setKeepFrontAfterSubmit}
        keepBackAfterSubmit={dialog.keepBackAfterSubmit}
        onKeepBackAfterSubmitChange={dialog.setKeepBackAfterSubmit}
        isCheckingDuplicateFront={dialog.isCheckingDuplicateFront}
        isDuplicateFront={dialog.isDuplicateFront}
        duplicateFrontMessage={dialog.duplicateFrontMessage}
        noDialog
        typeToggle={{
          mode: "single",
          onModeChange: handleModeSwitch as (mode: string) => void,
        }}
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
            {subjects && subjects.length > 0 ? (
              <div className="flex flex-col gap-5 sm:flex-row sm:gap-4">
                <div className="flex-1">
                  <SubjectSelect
                    value={aiForm.watch("subjectId")}
                    onChange={handleAiSubjectChange}
                    subjects={subjects}
                    id="ai-subject"
                    error={aiForm.formState.errors.subjectId?.message as string}
                  />
                </div>
                {aiForm.watch("subjectId") ? (
                  <div className="flex-1">
                    <DeckSelect
                      value={selectedDeckId}
                      onChange={(value) => {
                        setSelectedDeckId(value);
                        aiForm.setValue("deckId", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: false,
                        });
                      }}
                      decks={decks}
                      id="ai-deck"
                    />
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            ) : null}
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
              !aiForm.watch("text") ||
              !aiForm.watch("subjectId")
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
                Generate Flashcards
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
