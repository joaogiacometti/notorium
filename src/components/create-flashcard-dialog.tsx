"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createFlashcard } from "@/app/actions/flashcards";
import { TiptapEditor } from "@/components/tiptap-editor";
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
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import { useBeforeUnload } from "@/lib/use-before-unload";
import {
  type CreateFlashcardForm,
  createFlashcardSchema,
} from "@/lib/validations/flashcards";

interface CreateFlashcardDialogProps {
  subjectId: string;
  trigger?: React.ReactNode;
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
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const defaultValues = {
    subjectId,
    front: "",
    back: "",
  };
  const form = useForm({
    resolver: zodResolver(createFlashcardSchema),
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

  async function onSubmit(data: CreateFlashcardForm) {
    const result = await createFlashcard(data);
    if (result.success) {
      form.reset(defaultValues);
      setDiscardDialogOpen(false);
      onCreated?.(result.flashcard);
      onOpenChange(false);
    } else {
      toast.error(resolveActionErrorMessage(result, tErrors));
    }
  }

  function handleCtrlEnter() {
    if (form.formState.isSubmitting) {
      return;
    }

    void form.handleSubmit(onSubmit)();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <form
            id="form-create-flashcard"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup className="gap-4">
              <Controller
                name="front"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-create-flashcard-front">
                      {t("field_front")}
                    </FieldLabel>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_front_placeholder")}
                      id="form-create-flashcard-front"
                      aria-invalid={fieldState.invalid}
                      contentClassName="min-h-11 max-h-[40svh]"
                      showToolbar={false}
                      onCtrlEnter={handleCtrlEnter}
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
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_back_placeholder")}
                      id="form-create-flashcard-back"
                      aria-invalid={fieldState.invalid}
                      onCtrlEnter={handleCtrlEnter}
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
      <UnsavedChangesDialog
        open={discardDialogOpen}
        onOpenChange={handleDiscardDialogOpenChange}
        onDiscard={handleDiscardChanges}
      />
    </>
  );
}
