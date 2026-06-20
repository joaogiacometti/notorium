"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { generateFlashcards } from "@/app/actions/flashcard-generation";
import {
  createFlashcard,
  deleteFlashcard,
  editFlashcard,
} from "@/app/actions/flashcards";
import { getSubjectOptions } from "@/app/actions/subjects";
import { getEditFlashcardFormValues } from "@/components/flashcards/dialogs/edit-flashcard-form-values";
import { EditFlashcardSplitForm } from "@/components/flashcards/dialogs/edit-flashcard-split-form";
import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import { GenerateFlashcardsReview } from "@/components/flashcards/dialogs/generate-flashcards-review";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cleanupDiscardedEditorAttachments } from "@/features/attachments/client-cleanup";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
  toEditFlashcardPayload,
} from "@/features/flashcards/validation";
import { richTextToPlainText } from "@/lib/editor/rich-text";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import type {
  FlashcardEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

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
  flashcard: Pick<
    FlashcardEntity,
    | "id"
    | "subjectId"
    | "front"
    | "back"
    | "type"
    | "clozeSource"
    | "occlusionImagePathname"
    | "occlusionRegions"
  >;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiEnabled: boolean;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
  onDeleted?: (deletedId: string) => void | Promise<void>;
  className?: string;
  overlayClassName?: string;
}

export function EditFlashcardDialog({
  flashcard,
  open,
  onOpenChange,
  aiEnabled,
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
  const [splitSubjectId, setSplitSubjectId] = useState<string | null>(
    flashcard.subjectId ?? null,
  );
  const [splitFront, setSplitFront] = useState(flashcard.front);
  const [splitBack, setSplitBack] = useState(flashcard.back);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [_splitSubjects, setSplitSubjects] = useState<SubjectOption[]>([]);
  const [splitEditorPendingUploads, setSplitEditorPendingUploads] = useState(0);

  const isSplitDirty =
    splitFront !== flashcard.front || splitBack !== flashcard.back;

  // Split generates basic cards from front/back text. Cloze and occlusion cards
  // have no authored front/back (they derive it), so splitting does not apply.
  const canSplit = flashcard.type === "basic";
  const splitEnabled = aiEnabled && canSplit;

  const incomingValues = getEditFlashcardFormValues(flashcard);

  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: incomingValues,
  });

  useEffect(() => {
    if (open) {
      void getSubjectOptions().then((fetchedSubjects) => {
        setSubjects(fetchedSubjects);
        setSplitSubjects(fetchedSubjects);
      });
    }
  }, [open]);

  const dialog = useFlashcardDialogState({
    mode: "edit",
    open,
    aiEnabled,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) {
        setGeneratedCards(null);
        setMode("edit");
        setSplitFront(flashcard.front);
        setSplitBack(flashcard.back);
        setSplitSubjectId(flashcard.subjectId ?? null);
      }
      onOpenChange(nextOpen);
    },
    values: incomingValues,
    form,
    onSubmitAction: (values) =>
      editFlashcard(
        toEditFlashcardPayload(values as FlashcardFormValues & { id: string }),
      ),
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
    setSplitSubjectId(flashcard.subjectId ?? null);
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
    if (!aiEnabled) {
      return;
    }

    const combinedText = `Front:\n${richTextToPlainText(splitFront)}\n\nBack:\n${richTextToPlainText(splitBack)}`;

    setIsGenerating(true);
    setGeneratedCards(null);

    const result = await generateFlashcards({
      subjectId: splitSubjectId ?? "",
      text: combinedText,
    });

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

    for (const card of cards) {
      const result = await createFlashcard({
        type: "basic",
        subjectId: splitSubjectId ?? "",
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
    if (!aiEnabled) {
      return;
    }

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
      setSplitSubjectId(
        form.getValues("subjectId") ?? flashcard.subjectId ?? null,
      );
    } else if (mode === "split" && newMode === "edit") {
      form.setValue("front", splitFront, { shouldDirty: true });
      form.setValue("back", splitBack, { shouldDirty: true });
      form.setValue("subjectId", splitSubjectId ?? "");
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
          typeToggle={
            splitEnabled
              ? {
                  mode: "edit",
                  onModeChange: (m) => handleModeSwitch(m as EditMode),
                  options: modeOptions,
                }
              : undefined
          }
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
            typeToggle={
              splitEnabled
                ? {
                    mode: "split",
                    onModeChange: (m) => handleModeSwitch(m as EditMode),
                    options: modeOptions,
                  }
                : undefined
            }
          />
        </div>
      );
    }

    return (
      <EditFlashcardSplitForm
        subjects={subjects}
        splitSubjectId={splitSubjectId}
        splitFront={splitFront}
        splitBack={splitBack}
        isGenerating={isGenerating}
        isSplitImageUploading={splitEditorPendingUploads > 0}
        modeOptions={modeOptions}
        onSubjectChange={setSplitSubjectId}
        onFrontChange={setSplitFront}
        onBackChange={setSplitBack}
        onModeChange={(m) => handleModeSwitch(m as EditMode)}
        onImageUploadPendingChange={handleSplitEditorUploadPendingChange}
        onSubmit={handleFormSubmit}
      />
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl",
            className,
          )}
          overlayClassName={overlayClassName}
          // Occlusion edit has no text field before the image-occlusion help
          // (?) button, so while subjects load (subject + type controls disabled) the
          // dialog would auto-focus that button and flash its tooltip open. Skip
          // initial auto-focus for occlusion; basic/cloze keep editor focus.
          onOpenAutoFocus={
            flashcard.type === "occlusion"
              ? (event) => event.preventDefault()
              : undefined
          }
        >
          <DialogHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
            <DialogTitle>Edit Flashcard</DialogTitle>
          </DialogHeader>

          {renderContent()}
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={dialog.discardDialogOpen}
        onOpenChange={dialog.setDiscardDialogOpen}
        onDiscard={dialog.handleDiscardChanges}
        className={className}
        overlayClassName={overlayClassName}
      />
      <UnsavedChangesDialog
        open={discardOnModeSwitchDialogOpen}
        onOpenChange={setDiscardOnModeSwitchDialogOpen}
        onDiscard={handleDiscardOnModeSwitch}
        className={className}
        overlayClassName={overlayClassName}
      />
      <UnsavedChangesDialog
        open={discardOnCloseDialogOpen}
        onOpenChange={setDiscardOnCloseDialogOpen}
        onDiscard={handleDiscardOnClose}
        className={className}
        overlayClassName={overlayClassName}
      />
    </>
  );
}
