"use client";

import { HelpCircle } from "lucide-react";
import {
  Controller,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FlashcardFormValues } from "@/features/flashcards/validation";

interface FlashcardClozeFieldsProps<TValues extends FlashcardFormValues> {
  form: UseFormReturn<TValues>;
  formId: string;
  editorResetVersion?: number;
  onCtrlEnter: () => void;
  onImageUploadPendingChange: (pending: boolean) => void;
}

/**
 * Authoring fields for a cloze note: the deletion source and an optional extra.
 * Each `{{cN::answer}}` ordinal becomes an independently scheduled sibling card.
 *
 * @example
 * <FlashcardClozeFields form={form} formId="form-create-flashcard" ... />
 */
export function FlashcardClozeFields<TValues extends FlashcardFormValues>({
  form,
  formId,
  editorResetVersion,
  onCtrlEnter,
  onImageUploadPendingChange,
}: Readonly<FlashcardClozeFieldsProps<TValues>>) {
  return (
    <Controller
      name={"clozeSource" as FieldPath<TValues>}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center gap-1.5">
            <FieldLabel htmlFor={`${formId}-cloze`}>Cloze text</FieldLabel>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Cloze syntax help"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Wrap answers as {"{{c1::answer}}"}. Each c-number (c1, c2, …)
                  becomes its own scheduled card. Add an optional hint with{" "}
                  {"{{c1::answer::hint}}"}.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <TiptapEditor
            key={`${formId}-cloze-${editorResetVersion ?? 0}`}
            value={field.value ?? ""}
            onChange={field.onChange}
            placeholder="e.g. The {{c1::mitochondria}} is the powerhouse of the {{c2::cell}}."
            id={`${formId}-cloze`}
            aria-invalid={fieldState.invalid}
            contentClassName="min-h-11 max-h-[40svh]"
            imageUploadContext="flashcards"
            onCtrlEnter={onCtrlEnter}
            onImageUploadPendingChange={onImageUploadPendingChange}
          />
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : null}
        </Field>
      )}
    />
  );
}
