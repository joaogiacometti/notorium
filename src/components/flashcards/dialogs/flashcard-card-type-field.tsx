"use client";

import { useState } from "react";
import {
  type FieldPath,
  type PathValue,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { deleteEditorImages } from "@/app/actions/attachments";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cleanupDiscardedEditorAttachments } from "@/features/attachments/client-cleanup";
import {
  type FlashcardFormValues,
  hasRichTextContent,
} from "@/features/flashcards/validation";

const cardTypeOptions = [
  { value: "basic", label: "Basic" },
  { value: "cloze", label: "Cloze" },
  { value: "occlusion", label: "Image occlusion" },
];

interface FlashcardCardTypeFieldProps<TValues extends FlashcardFormValues> {
  form: UseFormReturn<TValues>;
  formId: string;
  disabled?: boolean;
}

/**
 * The "Card type" selector. Switching type clears the previous type's fields
 * (and their uploads) after confirmation, since each type ignores the others'
 * content. Switching is create-only; the field is disabled while editing.
 *
 * @example
 * <FlashcardCardTypeField form={form} formId="form-create-flashcard" />
 */
export function FlashcardCardTypeField<TValues extends FlashcardFormValues>({
  form,
  formId,
  disabled,
}: Readonly<FlashcardCardTypeFieldProps<TValues>>) {
  const [pendingCardType, setPendingCardType] = useState<string | null>(null);
  const cardType = useWatch({
    control: form.control,
    name: "type" as FieldPath<TValues>,
  }) as string | undefined;

  function setFormField(name: string, value: unknown) {
    form.setValue(
      name as FieldPath<TValues>,
      value as PathValue<TValues, FieldPath<TValues>>,
      { shouldDirty: true, shouldValidate: false },
    );
  }

  function currentTypeHasContent(): boolean {
    const values = form.getValues() as FlashcardFormValues;
    if (cardType === "occlusion") {
      return (
        Boolean(values.occlusionImagePathname) ||
        (values.occlusionRegions?.length ?? 0) > 0
      );
    }
    if (cardType === "cloze") {
      return (
        hasRichTextContent(values.clozeSource) ||
        hasRichTextContent(values.back)
      );
    }
    return hasRichTextContent(values.front) || hasRichTextContent(values.back);
  }

  async function applyCardTypeChange(nextType: string) {
    const values = form.getValues() as FlashcardFormValues;
    await cleanupDiscardedEditorAttachments(
      [values.front, values.back, values.clozeSource],
      [],
    );
    if (values.occlusionImagePathname) {
      await deleteEditorImages({ pathnames: [values.occlusionImagePathname] });
    }
    setFormField("front", "");
    setFormField("back", "");
    setFormField("clozeSource", "");
    setFormField("occlusionImagePathname", "");
    setFormField("occlusionRegions", []);
    setFormField("type", nextType);
  }

  function handleCardTypeChange(nextType: string) {
    if (nextType === cardType) {
      return;
    }
    if (currentTypeHasContent()) {
      setPendingCardType(nextType);
      return;
    }
    void applyCardTypeChange(nextType);
  }

  return (
    <Field className="w-fit">
      <FieldLabel htmlFor={`${formId}-card-type`}>Card type</FieldLabel>
      <Select
        value={cardType ?? "basic"}
        onValueChange={handleCardTypeChange}
        disabled={disabled}
      >
        <SelectTrigger id={`${formId}-card-type`} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {cardTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ActionConfirmationDialog
        open={pendingCardType !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingCardType(null);
          }
        }}
        title="Change card type?"
        description="Switching the card type clears the content you entered for this card."
        cancelLabel="Keep Editing"
        confirmLabel="Change type"
        pendingLabel="Changing..."
        confirmVariant="destructive"
        isPending={false}
        showCloseButton={false}
        onConfirm={() => {
          const nextType = pendingCardType;
          setPendingCardType(null);
          if (nextType) {
            void applyCardTypeChange(nextType);
          }
        }}
      />
    </Field>
  );
}
