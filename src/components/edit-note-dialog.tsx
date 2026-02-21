"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { editNote } from "@/app/actions/notes";
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
import { Textarea } from "@/components/ui/textarea";
import { type EditNoteForm, editNoteSchema } from "@/lib/validations/notes";

interface EditNoteDialogProps {
  note: {
    id: string;
    title: string;
    content: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditNoteDialog({
  note,
  open,
  onOpenChange,
}: Readonly<EditNoteDialogProps>) {
  const form = useForm<EditNoteForm>({
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
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                  <Textarea
                    {...field}
                    id="form-edit-note-content"
                    placeholder="Write your note here..."
                    rows={6}
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
