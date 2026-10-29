"use client";

import { useState } from "react";
import {
  Controller,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";
import { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import { FlashcardCardEditor } from "@/components/flashcards/shared/flashcard-card-editor";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectSelect } from "@/components/shared/subject-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface CreateFlashcardKeepOptions {
  keepFrontAfterSubmit: boolean;
  onKeepFrontAfterSubmitChange: (value: boolean) => void;
  keepBackAfterSubmit: boolean;
  onKeepBackAfterSubmitChange: (value: boolean) => void;
}

interface CreateFlashcardFormProps<TValues extends FlashcardFormValues> {
  open: boolean;
  form: UseFormReturn<TValues>;
  formId: string;
  editorResetVersion?: number;
  subjects: SubjectOption[];
  onCreateSubject?: (name: string) => Promise<boolean>;
  onSubmit: (values: TValues) => Promise<void>;
  isSubmitting: boolean;
  isSaved?: boolean;
  aiEnabled: boolean;
  duplicateFrontMessage: string | null;
  keepOptions: CreateFlashcardKeepOptions;
}

/**
 * Body and footer of the create dialog: subject, the shared card editor, and
 * a footer that keeps chosen fields for rapid consecutive captures.
 *
 * @example <CreateFlashcardForm open form={form} formId="form-create-flashcard" ... />
 */
export function CreateFlashcardForm<TValues extends FlashcardFormValues>({
  open,
  form,
  formId,
  editorResetVersion,
  subjects,
  onCreateSubject,
  onSubmit,
  isSubmitting,
  isSaved,
  aiEnabled,
  duplicateFrontMessage,
  keepOptions,
}: Readonly<CreateFlashcardFormProps<TValues>>) {
  const [pendingImageUploads, setPendingImageUploads] = useState(0);
  const isImageUploading = pendingImageUploads > 0;
  const review = useActiveFlashcardEditor({
    form,
    enabled: open && aiEnabled,
    resetVersion: editorResetVersion,
    subjects,
    blocked: isSubmitting || isImageUploading,
  });
  const submitBlocked = isSubmitting || isImageUploading || review.blocked;

  function handleImageUploadPendingChange(pending: boolean) {
    setPendingImageUploads((current) =>
      pending ? current + 1 : Math.max(0, current - 1),
    );
  }

  const submit = form.handleSubmit(async (values) => {
    if (!submitBlocked) await onSubmit(values);
  });

  return (
    <form id={formId} onSubmit={submit} className="flex min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 sm:px-6">
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
              onCreateSubject={onCreateSubject}
            />
          )}
        />
        <FlashcardCardEditor
          form={form}
          idPrefix={formId}
          review={review}
          reviewDisabled={isSubmitting || isImageUploading}
          frontError={duplicateFrontMessage}
          editorKey={editorResetVersion}
          onCtrlEnter={() => void submit()}
          onImageUploadPendingChange={(_side, pending) =>
            handleImageUploadPendingChange(pending)
          }
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-t px-4 py-3 sm:px-6">
        <KeepFieldToggle
          id={`${formId}-keep-front`}
          label="Keep front"
          checked={keepOptions.keepFrontAfterSubmit}
          disabled={isSubmitting}
          onCheckedChange={keepOptions.onKeepFrontAfterSubmitChange}
        />
        <KeepFieldToggle
          id={`${formId}-keep-back`}
          label="Keep back"
          checked={keepOptions.keepBackAfterSubmit}
          disabled={isSubmitting}
          onCheckedChange={keepOptions.onKeepBackAfterSubmitChange}
        />
        <Button
          type="submit"
          form={formId}
          disabled={submitBlocked}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          className={cn(
            "ml-auto",
            isSaved &&
              "bg-(--intent-success-fill) text-primary-foreground hover:bg-(--intent-success-fill)/90",
          )}
        >
          <AsyncButtonContent
            pending={isSubmitting}
            idleLabel="Create"
            pendingLabel="Creating..."
            saved={isSaved}
            savedLabel="Created"
          />
        </Button>
      </div>
    </form>
  );
}

interface KeepFieldToggleProps {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function KeepFieldToggle({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: Readonly<KeepFieldToggleProps>) {
  return (
    <div
      className="flex items-center gap-2"
      title={`${label} for the next card`}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
    </div>
  );
}
