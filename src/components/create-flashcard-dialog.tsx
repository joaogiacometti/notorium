"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createFlashcard } from "@/app/actions/flashcards";
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
import { Textarea } from "@/components/ui/textarea";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import {
  type CreateFlashcardForm,
  createFlashcardSchema,
} from "@/lib/validations/flashcards";

interface CreateFlashcardDialogProps {
  subjectId: string;
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
}

export function CreateFlashcardDialog({
  subjectId,
  trigger,
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreateFlashcardDialogProps>) {
  const t = useTranslations("CreateFlashcardDialog");
  const tErrors = useTranslations("ServerActions");
  const form = useForm({
    resolver: zodResolver(createFlashcardSchema),
    defaultValues: {
      subjectId,
      front: "",
      back: "",
    },
  });

  async function onSubmit(data: CreateFlashcardForm) {
    const result = await createFlashcard(data);
    if (result.success) {
      form.reset({
        subjectId,
        front: "",
        back: "",
      });
      onCreated?.(result.flashcard);
      onOpenChange(false);
    } else {
      toast.error(resolveActionErrorMessage(result, tErrors));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form id="form-create-flashcard" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="front"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-flashcard-front">
                    {t("field_front")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-create-flashcard-front"
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
                  <FieldLabel htmlFor="form-create-flashcard-back">
                    {t("field_back")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-create-flashcard-back"
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
              form="form-create-flashcard"
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
