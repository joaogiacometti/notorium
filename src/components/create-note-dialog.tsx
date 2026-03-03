"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createNote } from "@/app/actions/notes";
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
import { Input } from "@/components/ui/input";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { useBeforeUnload } from "@/lib/use-before-unload";
import { type CreateNoteForm, createNoteSchema } from "@/lib/validations/notes";

interface CreateNoteDialogProps {
  subjectId: string;
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNoteDialog({
  subjectId,
  trigger,
  open,
  onOpenChange,
}: Readonly<CreateNoteDialogProps>) {
  const t = useTranslations("CreateNoteDialog");
  const _tCommon = useTranslations("Common");
  const queryClient = useQueryClient();
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const defaultValues = {
    title: "",
    content: "",
    subjectId,
  };
  const form = useForm({
    resolver: zodResolver(createNoteSchema),
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

  async function onSubmit(data: CreateNoteForm) {
    const result = await createNote(data);
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      form.reset(defaultValues);
      setDiscardDialogOpen(false);
      onOpenChange(false);
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <form id="form-create-note" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-4">
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-create-note-title">
                      Title
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-create-note-title"
                      placeholder="e.g. Lecture 1 — Introduction"
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
                    <FieldLabel htmlFor="form-create-note-content">
                      Content
                    </FieldLabel>
                    <TiptapEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Start writing your notes..."
                      id="form-create-note-content"
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
                form="form-create-note"
                disabled={form.formState.isSubmitting}
                className="w-full"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Create Note
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
