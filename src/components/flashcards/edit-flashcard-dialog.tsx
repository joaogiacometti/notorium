"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  createFlashcard,
  deleteFlashcard,
  editFlashcard,
  generateFlashcards,
} from "@/app/actions/flashcards";
import { CreateModeToggle } from "@/components/flashcards/create-mode-toggle";
import { FlashcardDialogForm } from "@/components/flashcards/flashcard-dialog-form";
import { GenerateFlashcardsReview } from "@/components/flashcards/generate-flashcards-review";
import { useFlashcardDialogState } from "@/components/flashcards/use-flashcard-dialog-state";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { SubjectSelect } from "@/components/shared/subject-select";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  type EditFlashcardForm,
  editFlashcardSchema,
  type GenerateFlashcardsForm,
  generateFlashcardsSchema,
} from "@/features/flashcards/validation";
import { richTextToPlainText } from "@/lib/editor/rich-text";
import type {
  FlashcardEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

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
  flashcard: Pick<FlashcardEntity, "id" | "subjectId" | "front" | "back">;
  subjects?: SubjectEntity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
  onDeleted?: (deletedId: string) => void | Promise<void>;
}

export function EditFlashcardDialog({
  flashcard,
  subjects,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Readonly<EditFlashcardDialogProps>) {
  const [mode, setMode] = useState<EditMode>("edit");
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[] | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [discardOnModeSwitchDialogOpen, setDiscardOnModeSwitchDialogOpen] =
    useState(false);

  const incomingValues = getEditFlashcardFormValues(flashcard);

  const form = useForm<EditFlashcardForm>({
    resolver: zodResolver(editFlashcardSchema),
    defaultValues: incomingValues,
  });

  const aiForm = useForm<GenerateFlashcardsForm>({
    resolver: zodResolver(generateFlashcardsSchema),
    defaultValues: { subjectId: flashcard.subjectId, text: "" },
  });

  const dialog = useFlashcardDialogState({
    mode: "edit",
    open,
    onOpenChange: (nextOpen) => {
      if (!nextOpen) {
        setGeneratedCards(null);
        setMode("edit");
      }
      onOpenChange(nextOpen);
    },
    values: incomingValues,
    form,
    onSubmitAction: editFlashcard,
    onSuccess: (updatedFlashcard) => {
      if (updatedFlashcard) {
        return onUpdated?.(updatedFlashcard);
      }
    },
    getSuccessValues: (submittedValues) => submittedValues,
    closeOnSuccess: true,
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

    for (const card of cards) {
      const result = await createFlashcard({
        subjectId: aiForm.getValues().subjectId,
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
      const subjectId = form.getValues("subjectId");
      if (subjectId) {
        aiForm.setValue("subjectId", subjectId);
      }
      if (!aiForm.getValues("text")) {
        const text = `Front:\n${richTextToPlainText(
          flashcard.front,
        )}\n\nBack:\n${richTextToPlainText(flashcard.back)}`;
        aiForm.setValue("text", text);
      }
    } else if (mode === "split" && newMode === "edit") {
      const subjectId = aiForm.getValues("subjectId");
      if (subjectId) {
        form.setValue("subjectId", subjectId);
      }
    }
    setMode(newMode);
  }

  function handleDiscardOnModeSwitch() {
    setGeneratedCards(null);
    setDiscardOnModeSwitchDialogOpen(false);
    setMode("edit");
  }

  function handleBackToInput() {
    setGeneratedCards(null);
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
          discardDialogOpen={dialog.discardDialogOpen}
          onDiscardDialogOpenChange={dialog.setDiscardDialogOpen}
          onDiscard={dialog.handleDiscardChanges}
          isGeneratingBack={dialog.isGeneratingBack}
          isSubmitting={dialog.isSubmitting}
          canUseAiBack={dialog.canUseAiBack}
          onGenerateBack={dialog.handleGenerateBack}
          keepFrontAfterSubmit={dialog.keepFrontAfterSubmit}
          onKeepFrontAfterSubmitChange={dialog.setKeepFrontAfterSubmit}
          keepBackAfterSubmit={dialog.keepBackAfterSubmit}
          onKeepBackAfterSubmitChange={dialog.setKeepBackAfterSubmit}
          isCheckingDuplicateFront={dialog.isCheckingDuplicateFront}
          isDuplicateFront={dialog.isDuplicateFront}
          duplicateFrontMessage={dialog.duplicateFrontMessage}
          previousBack={dialog.previousBack}
          proposedBack={dialog.proposedBack}
          onAcceptBack={dialog.handleAcceptBack}
          onRejectBack={dialog.handleRejectBack}
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

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleGenerate();
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-5 sm:px-6">
          <FieldGroup className="gap-5">
            {subjects && subjects.length > 0 ? (
              <SubjectSelect
                value={aiForm.watch("subjectId")}
                onChange={(value) => aiForm.setValue("subjectId", value)}
                subjects={subjects}
                id="ai-subject"
                error={aiForm.formState.errors.subjectId?.message as string}
              />
            ) : null}
            <CreateModeToggle
              mode="split"
              onModeChange={(m) => handleModeSwitch(m as EditMode)}
              options={modeOptions}
            />
            <Field>
              <FieldLabel htmlFor="ai-text">Content to Split</FieldLabel>
              <TiptapEditor
                value={aiForm.watch("text")}
                onChange={(value) => aiForm.setValue("text", value)}
                placeholder="Content to be divided into multiple flashcards..."
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
                Splitting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Split Flashcard
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
        <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
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
    </>
  );
}

function getEditFlashcardFormValues(
  flashcard: Pick<FlashcardEntity, "id" | "subjectId" | "front" | "back">,
): EditFlashcardForm {
  return {
    id: flashcard.id,
    subjectId: flashcard.subjectId,
    front: flashcard.front,
    back: flashcard.back,
  };
}
