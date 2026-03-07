"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editFlashcard } from "@/app/actions/flashcards";
import { TiptapEditor } from "@/components/tiptap-editor";
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
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import { useBeforeUnload } from "@/lib/use-before-unload";
import {
  type EditFlashcardForm,
  editFlashcardSchema,
} from "@/lib/validations/flashcards";

interface EditFlashcardDialogProps {
  flashcard: Pick<FlashcardEntity, "id" | "front" | "back">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (flashcard: FlashcardEntity) => void | Promise<void>;
}

export function EditFlashcardDialog({
  flashcard,
  open,
  onOpenChange,
  onUpdated,
}: Readonly<EditFlashcardDialogProps>) {
  const t = useTranslations("EditFlashcardDialog");
  const tErrors = useTranslations("ServerActions");
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const defaultValues = {
    id: flashcard.id,
    front: flashcard.front,
    back: flashcard.back,
  };
  const form = useForm({
    resolver: zodResolver(editFlashcardSchema),
    defaultValues,
  });
  useBeforeUnload(
    open && form.formState.isDirty && !form.formState.isSubmitting,
  );

  function handleDiscardChanges() {
    form.reset(defaultValues);
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  function handleDiscardDialogOpenChange(nextOpen: boolean) {
    setDiscardDialogOpen(nextOpen);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDiscardDialogOpen(false);
      onOpenChange(true);
      return;
    }

    const hasUnsavedChanges =
      form.formState.isDirty && !form.formState.isSubmitting;

    if (hasUnsavedChanges) {
      setDiscardDialogOpen(true);
      return;
    }

    form.reset(defaultValues);
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  async function onSubmit(data: EditFlashcardForm) {
    const result = await editFlashcard(data);
    if (result.success) {
      await onUpdated?.(result.flashcard);
      form.reset(data);
      setDiscardDialogOpen(false);
      onOpenChange(false);
    } else {
      toast.error(resolveActionErrorMessage(result, tErrors));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <form id="form-edit-flashcard" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Controller
                name="front"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-edit-flashcard-front">
                      {t("field_front")}
                    </FieldLabel>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_front_placeholder")}
                      id="form-edit-flashcard-front"
                      aria-invalid={fieldState.invalid}
                      contentClassName="min-h-11 max-h-[40svh]"
                      showToolbar={false}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="back"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-edit-flashcard-back">
                      {t("field_back")}
                    </FieldLabel>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_back_placeholder")}
                      id="form-edit-flashcard-back"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Button
                type="submit"
                form="form-edit-flashcard"
                disabled={form.formState.isSubmitting}
                className="w-full"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {t("submit")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={discardDialogOpen}
        onOpenChange={handleDiscardDialogOpenChange}
        onDiscard={handleDiscardChanges}
      />
    </>
  );
}
