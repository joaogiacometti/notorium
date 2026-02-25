"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editNote } from "@/app/actions/notes";
import { MarkdownEditor } from "@/components/markdown-editor";
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
import type { NoteEditDto } from "@/lib/api/contracts";
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
  const form = useForm({
    resolver: zodResolver(editNoteSchema),
    defaultValues: {
      id: note.id,
      title: note.title,
      content: note.content ?? "",
    },
  });

  async function onSubmit(data: EditNoteForm) {
    const result = await editNote(data);
    if (result.success) {
      onOpenChange(false);
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>
        <form id="form-edit-note" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-note-title">Title</FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-note-title"
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
                  <FieldLabel htmlFor="form-edit-note-content">
                    Content
                  </FieldLabel>
                  <MarkdownEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Write your note here... (Markdown supported)"
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
              Save Changes
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
