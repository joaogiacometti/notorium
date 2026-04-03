"use client";

import { Loader2, Pin, PinOff, Sparkles } from "lucide-react";
import {
  Controller,
  type FieldPath,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { CreateModeToggle } from "@/components/flashcards/create-mode-toggle";
import { FlashcardBackDiff } from "@/components/flashcards/flashcard-back-diff";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
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
import {
  type CreateFlashcardForm,
  type EditFlashcardForm,
  hasRichTextContent,
} from "@/features/flashcards/validation";
import type { SubjectEntity } from "@/lib/server/api-contracts";

type FlashcardFormValues = CreateFlashcardForm | EditFlashcardForm;

interface FlashcardDialogFormProps<TValues extends FlashcardFormValues> {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  form: UseFormReturn<TValues>;
  formId: string;
  subjects?: SubjectEntity[];
  onSubmit: (values: TValues) => Promise<void>;
  discardDialogOpen: boolean;
  onDiscardDialogOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  isGeneratingBack: boolean;
  isSubmitting: boolean;
  canUseAiBack: boolean;
  onGenerateBack: () => Promise<void>;
  previousBack: string | null;
  proposedBack: string | null;
  onAcceptBack: () => void;
  onRejectBack: () => void;
  keepFrontAfterSubmit: boolean;
  onKeepFrontAfterSubmitChange: (value: boolean) => void;
  keepBackAfterSubmit: boolean;
  onKeepBackAfterSubmitChange: (value: boolean) => void;
  isCheckingDuplicateFront: boolean;
  isDuplicateFront: boolean;
  duplicateFrontMessage: string;
  noDialog?: boolean;
  typeToggle?: {
    mode: "single" | "ai";
    onModeChange: (mode: "single" | "ai") => void;
    disabled?: boolean;
  };
}

export function FlashcardDialogForm<TValues extends FlashcardFormValues>({
  mode,
  open,
  onOpenChange,
  trigger,
  form,
  formId,
  subjects,
  onSubmit,
  discardDialogOpen,
  onDiscardDialogOpenChange,
  onDiscard,
  isGeneratingBack,
  isSubmitting,
  canUseAiBack,
  onGenerateBack,
  previousBack,
  proposedBack,
  onAcceptBack,
  onRejectBack,
  keepFrontAfterSubmit,
  onKeepFrontAfterSubmitChange,
  keepBackAfterSubmit,
  onKeepBackAfterSubmitChange,
  isCheckingDuplicateFront,
  isDuplicateFront,
  duplicateFrontMessage,
  noDialog,
  typeToggle,
}: Readonly<FlashcardDialogFormProps<TValues>>) {
  function handleCtrlEnter() {
    if (isSubmitting) {
      return;
    }

    void form.handleSubmit(onSubmit)();
  }

  const pendingSubmitLabel = mode === "create" ? "Creating..." : "Saving...";

  const watchedBack = useWatch({
    control: form.control,
    name: "back" as FieldPath<TValues>,
  });
  const hasBack = hasRichTextContent(watchedBack);
  const generateLabel = hasBack ? "Improve with AI" : "Generate with AI";
  const generatingLabel = hasBack ? "Improving..." : "Generating...";

  const formContent = (
    <form
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-5 sm:px-6">
        <FieldGroup className="gap-5">
          {subjects && subjects.length > 0 ? (
            <Controller
              name={"subjectId" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <SubjectSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  subjects={subjects}
                  id={`${formId}-subject`}
                  error={fieldState.error?.message as string}
                  ariaInvalid={fieldState.invalid}
                />
              )}
            />
          ) : null}
          {typeToggle ? (
            <CreateModeToggle
              mode={typeToggle.mode}
              onModeChange={typeToggle.onModeChange}
              disabled={typeToggle.disabled}
            />
          ) : null}
          <Controller
            name={"front" as FieldPath<TValues>}
            control={form.control}
            render={({ field, fieldState }) => {
              const frontInvalid = fieldState.invalid || isDuplicateFront;
              let frontFeedback: React.ReactNode = null;

              if (fieldState.invalid) {
                frontFeedback = <FieldError errors={[fieldState.error]} />;
              } else if (isDuplicateFront) {
                frontFeedback = (
                  <p className="text-destructive text-sm">
                    {duplicateFrontMessage}
                  </p>
                );
              }

              return (
                <Field data-invalid={frontInvalid}>
                  <div className="flex h-9 items-center justify-between gap-3">
                    <FieldLabel htmlFor={`${formId}-front`}>Front</FieldLabel>
                    <div className="flex items-center gap-1">
                      {mode === "create" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={
                            keepFrontAfterSubmit
                              ? "Clear front after submit"
                              : "Keep front after submit"
                          }
                          title={
                            keepFrontAfterSubmit
                              ? "Clear front after submit"
                              : "Keep front after submit"
                          }
                          aria-pressed={keepFrontAfterSubmit}
                          onClick={() =>
                            onKeepFrontAfterSubmitChange(!keepFrontAfterSubmit)
                          }
                          disabled={isSubmitting}
                        >
                          {keepFrontAfterSubmit ? (
                            <Pin className="size-3.5" />
                          ) : (
                            <PinOff className="size-3.5" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <TiptapEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="e.g. What is photosynthesis?"
                    id={`${formId}-front`}
                    aria-invalid={frontInvalid}
                    contentClassName="min-h-11 max-h-[40svh]"
                    showToolbar={false}
                    onCtrlEnter={handleCtrlEnter}
                  />
                  {frontFeedback}
                </Field>
              );
            }}
          />
          <Controller
            name={"back" as FieldPath<TValues>}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor={`${formId}-back`}>Back</FieldLabel>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-7 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
                        onClick={() => void onGenerateBack()}
                        disabled={!canUseAiBack}
                      >
                        {isGeneratingBack ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        {isGeneratingBack ? generatingLabel : generateLabel}
                      </Button>
                      {mode === "create" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={
                            keepBackAfterSubmit
                              ? "Clear back after submit"
                              : "Keep back after submit"
                          }
                          title={
                            keepBackAfterSubmit
                              ? "Clear back after submit"
                              : "Keep back after submit"
                          }
                          aria-pressed={keepBackAfterSubmit}
                          onClick={() =>
                            onKeepBackAfterSubmitChange(!keepBackAfterSubmit)
                          }
                          disabled={isSubmitting}
                        >
                          {keepBackAfterSubmit ? (
                            <Pin className="size-3.5" />
                          ) : (
                            <PinOff className="size-3.5" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {proposedBack && previousBack ? (
                  <FlashcardBackDiff
                    previousBack={previousBack}
                    proposedBack={proposedBack}
                    originalLabel="Original"
                    proposedLabel="Proposed"
                    acceptLabel="Accept"
                    rejectLabel="Reject"
                    onAccept={onAcceptBack}
                    onReject={onRejectBack}
                  />
                ) : (
                  <TiptapEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="e.g. Process plants use to convert light into energy."
                    id={`${formId}-back`}
                    aria-invalid={fieldState.invalid}
                    contentClassName="max-h-[10lh]"
                    onCtrlEnter={handleCtrlEnter}
                  />
                )}
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        </FieldGroup>
      </div>
      <div className="shrink-0 border-t px-4 py-4 sm:px-6">
        <Button
          type="submit"
          form={formId}
          disabled={
            isSubmitting ||
            isGeneratingBack ||
            isCheckingDuplicateFront ||
            isDuplicateFront
          }
          className="w-full"
        >
          <AsyncButtonContent
            pending={isSubmitting}
            idleLabel={mode === "create" ? "Create Flashcard" : "Save Changes"}
            pendingLabel={pendingSubmitLabel}
          />
        </Button>
      </div>
    </form>
  );

  if (noDialog) {
    return (
      <>
        {formContent}
        <UnsavedChangesDialog
          open={discardDialogOpen}
          onOpenChange={onDiscardDialogOpenChange}
          onDiscard={onDiscard}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
            <DialogTitle>
              {mode === "create" ? "Create Flashcard" : "Edit Flashcard"}
            </DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={discardDialogOpen}
        onOpenChange={onDiscardDialogOpenChange}
        onDiscard={onDiscard}
      />
    </>
  );
}
