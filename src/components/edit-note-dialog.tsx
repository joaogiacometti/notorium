"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editNote } from "@/app/actions/notes";
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
import { Input } from "@/components/ui/input";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import type { NoteEditDto } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import { useBeforeUnload } from "@/lib/use-before-unload";
import { type EditNoteForm, editNoteSchema } from "@/lib/validations/notes";

interface EditNoteDialogProps {
  note: NoteEditDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditNoteDialog({
  note,
  open,
  onOpenChange,
}: Readonly<EditNoteDialogProps>) {
  const t = useTranslations("EditNoteDialog");
  const tErrors = useTranslations("ServerActions");
  const queryClient = useQueryClient();
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const defaultValues = {
    id: note.id,
    title: note.title,
    content: note.content ?? "",
  };
  const form = useForm({
    resolver: zodResolver(editNoteSchema),
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

  async function onSubmit(data: EditNoteForm) {
    const result = await editNote(data);
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
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
          <form id="form-edit-note" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-edit-note-title">
                      {t("field_title")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-edit-note-title"
                      placeholder={t("field_title_placeholder")}
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
                name="content"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-edit-note-content">
                      {t("field_content")}
                    </FieldLabel>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("field_content_placeholder")}
                      id="form-edit-note-content"
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
                form="form-edit-note"
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
