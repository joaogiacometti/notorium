"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editFlashcard } from "@/app/actions/flashcards";
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
import { Textarea } from "@/components/ui/textarea";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import {
  type EditFlashcardForm,
  editFlashcardSchema,
} from "@/lib/validations/flashcards";

interface EditFlashcardDialogProps {
  flashcard: Pick<FlashcardEntity, "id" | "front" | "back">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFlashcardDialog({
  flashcard,
  open,
  onOpenChange,
}: Readonly<EditFlashcardDialogProps>) {
  const t = useTranslations("EditFlashcardDialog");
  const tErrors = useTranslations("ServerActions");
  const form = useForm({
    resolver: zodResolver(editFlashcardSchema),
    defaultValues: {
      id: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
    },
  });

  async function onSubmit(data: EditFlashcardForm) {
    const result = await editFlashcard(data);
    if (result.success) {
      onOpenChange(false);
    } else {
      toast.error(resolveActionErrorMessage(result, tErrors));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
                  <Textarea
                    {...field}
                    id="form-edit-flashcard-front"
                    placeholder={t("field_front_placeholder")}
                    rows={3}
                    className="resize-none"
                    aria-invalid={fieldState.invalid}
                    autoFocus
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
                  <Textarea
                    {...field}
                    id="form-edit-flashcard-back"
                    placeholder={t("field_back_placeholder")}
                    rows={5}
                    className="resize-none"
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
  );
}
