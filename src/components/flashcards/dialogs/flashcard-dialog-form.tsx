"use client";

import { Pin, PinOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Controller,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";
import { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import { FlashcardEditorDialogContent } from "@/components/flashcards/dialogs/flashcard-editor-dialog-content";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { SubjectSelect } from "@/components/shared/subject-select";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import type { FlashcardFormValues as FlashcardFormSchemaValues } from "@/features/flashcards/validation";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

type FlashcardFormValues = FlashcardFormSchemaValues;
const FlashcardFieldReview = dynamic(
  () =>
    import("@/components/flashcards/dialogs/flashcard-field-review").then(
      (module) => module.FlashcardFieldReview,
    ),
  { ssr: false },
);

interface FlashcardDialogDiscardConfig {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}

interface FlashcardDialogDuplicateConfig {
  isChecking: boolean;
  isDuplicate: boolean;
  message: string;
}

interface FlashcardDialogCreateOptions {
  keepFrontAfterSubmit: boolean;
  onKeepFrontAfterSubmitChange: (value: boolean) => void;
  keepBackAfterSubmit: boolean;
  onKeepBackAfterSubmitChange: (value: boolean) => void;
}

interface FlashcardDialogFormBaseProps<TValues extends FlashcardFormValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  form: UseFormReturn<TValues>;
  formId: string;
  editorResetVersion?: number;
  subjects?: SubjectOption[];
  onCreateSubject?: (name: string) => Promise<boolean>;
  onSubmit: (values: TValues) => Promise<void>;
  isSubmitting: boolean;
  isSaved?: boolean;
  discard: FlashcardDialogDiscardConfig;
  aiEnabled: boolean;
  duplicateFront: FlashcardDialogDuplicateConfig;
  noDialog?: boolean;
}

type FlashcardDialogFormProps<TValues extends FlashcardFormValues> =
  | ({
      mode: "create";
      createOptions: FlashcardDialogCreateOptions;
    } & FlashcardDialogFormBaseProps<TValues>)
  | ({
      mode: "edit";
      createOptions?: never;
    } & FlashcardDialogFormBaseProps<TValues>);

export function FlashcardDialogForm<TValues extends FlashcardFormValues>({
  mode,
  open,
  onOpenChange,
  trigger,
  form,
  formId,
  editorResetVersion,
  subjects,
  onCreateSubject,
  onSubmit,
  isSubmitting,
  isSaved,
  discard,
  aiEnabled,
  duplicateFront,
  createOptions,
  noDialog,
}: Readonly<FlashcardDialogFormProps<TValues>>) {
  const [pendingImageUploads, setPendingImageUploads] = useState(0);

  function handleImageUploadPendingChange(pending: boolean) {
    setPendingImageUploads((current) => {
      if (pending) {
        return current + 1;
      }

      return Math.max(0, current - 1);
    });
  }

  function handleCtrlEnter() {
    if (isSubmitting || review.blocked || pendingImageUploads > 0) {
      return;
    }

    void form.handleSubmit(onSubmit)();
  }

  const pendingSubmitLabel = mode === "create" ? "Creating..." : "Saving...";

  const keepFrontAfterSubmit = createOptions?.keepFrontAfterSubmit ?? false;
  const keepBackAfterSubmit = createOptions?.keepBackAfterSubmit ?? false;
  const isImageUploading = pendingImageUploads > 0;
  const review = useActiveFlashcardEditor({
    form,
    enabled: open && aiEnabled,
    resetVersion: editorResetVersion,
    subjects,
    blocked: isSubmitting || isImageUploading,
  });

  const formContent = (
    <form
      id={formId}
      onSubmit={form.handleSubmit(async (values) => {
        if (!review.blocked && !isImageUploading && !isSubmitting)
          await onSubmit(values);
      })}
      className="flex min-h-0 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-5 sm:px-6">
        <FieldGroup className="gap-4">
          {subjects ? (
            <Controller
              name={"subjectId" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <SubjectSelect
                  value={(field.value ?? null) as string | null}
                  onChange={field.onChange}
                  subjects={subjects}
                  id={`${formId}-subject`}
                  error={fieldState.error?.message as string}
                  ariaInvalid={fieldState.invalid}
                  disabled={subjects.length === 0 && !onCreateSubject}
                  onCreateSubject={
                    mode === "create" ? onCreateSubject : undefined
                  }
                />
              )}
            />
          ) : null}
          <Controller
            name={"front" as FieldPath<TValues>}
            control={form.control}
            render={({ field, fieldState }) => {
              const frontInvalid =
                fieldState.invalid || duplicateFront.isDuplicate;
              let frontFeedback: React.ReactNode = null;

              if (fieldState.invalid) {
                frontFeedback = <FieldError errors={[fieldState.error]} />;
              } else if (duplicateFront.isDuplicate) {
                frontFeedback = (
                  <p className="text-destructive text-sm">
                    {duplicateFront.message}
                  </p>
                );
              }

              return (
                <Field data-invalid={frontInvalid}>
                  <div className="flex min-h-6 items-center justify-between gap-3">
                    <FieldLabel htmlFor={`${formId}-front`}>Front</FieldLabel>
                    <div className="flex items-center gap-1">
                      {mode === "create" && createOptions ? (
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
                            createOptions.onKeepFrontAfterSubmitChange(
                              !keepFrontAfterSubmit,
                            )
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
                  {review.pending?.fields.front ? (
                    <FlashcardFieldReview
                      key={`${review.pending.toolCallId}-front`}
                      field="front"
                      disabled={isSubmitting || isImageUploading}
                      proposal={review.pending.fields.front}
                      onDecide={(accept) => review.decide?.("front", accept)}
                    />
                  ) : (
                    <TiptapEditor
                      key={`${formId}-front-${editorResetVersion ?? 0}`}
                      value={(field.value ?? "") as string}
                      onChange={field.onChange}
                      placeholder="e.g. What is photosynthesis?"
                      id={`${formId}-front`}
                      aria-invalid={frontInvalid}
                      contentClassName="min-h-11 max-h-[40svh]"
                      imageUploadContext="flashcards"
                      onCtrlEnter={handleCtrlEnter}
                      onImageUploadPendingChange={
                        handleImageUploadPendingChange
                      }
                    />
                  )}
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
                  <div className="flex min-h-6 items-center justify-between gap-3">
                    <FieldLabel htmlFor={`${formId}-back`}>Back</FieldLabel>
                    <div className="flex items-center gap-1">
                      {mode === "create" && createOptions ? (
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
                            createOptions.onKeepBackAfterSubmitChange(
                              !keepBackAfterSubmit,
                            )
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
                {review.pending?.fields.back ? (
                  <FlashcardFieldReview
                    key={`${review.pending.toolCallId}-back`}
                    field="back"
                    disabled={isSubmitting || isImageUploading}
                    proposal={review.pending.fields.back}
                    onDecide={(accept) => review.decide?.("back", accept)}
                  />
                ) : (
                  <TiptapEditor
                    key={`${formId}-back-${editorResetVersion ?? 0}`}
                    value={(field.value ?? "") as string}
                    onChange={field.onChange}
                    placeholder="e.g. Process plants use to convert light into energy."
                    id={`${formId}-back`}
                    aria-invalid={fieldState.invalid}
                    contentClassName="min-h-24 max-h-[10lh]"
                    imageUploadContext="flashcards"
                    onCtrlEnter={handleCtrlEnter}
                    onImageUploadPendingChange={handleImageUploadPendingChange}
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
            isImageUploading ||
            duplicateFront.isChecking ||
            duplicateFront.isDuplicate ||
            review.blocked
          }
          className={cn(
            "w-full",
            isSaved &&
              "bg-(--intent-success-fill) text-primary-foreground hover:bg-(--intent-success-fill)/90",
          )}
        >
          <AsyncButtonContent
            pending={isSubmitting}
            idleLabel={mode === "create" ? "Create Flashcard" : "Save Changes"}
            pendingLabel={pendingSubmitLabel}
            saved={isSaved}
            savedLabel="Saved"
          />
        </Button>
      </div>
    </form>
  );

  if (noDialog) {
    return formContent;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <FlashcardEditorDialogContent>
          <DialogHeader className="shrink-0 px-4 pt-5 pb-1 sm:px-6 sm:pt-6">
            <DialogTitle>
              {mode === "create" ? "Create Flashcard" : "Edit Flashcard"}
            </DialogTitle>
          </DialogHeader>
          {formContent}
        </FlashcardEditorDialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={discard.open}
        onOpenChange={discard.onOpenChange}
        onDiscard={discard.onDiscard}
      />
    </>
  );
}
