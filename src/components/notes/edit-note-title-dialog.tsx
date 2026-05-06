"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editNote } from "@/app/actions/notes";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { type EditNoteForm, editNoteSchema } from "@/features/notes/validation";
import { t } from "@/lib/server/server-action-errors";

interface EditNoteTitleDialogProps {
  note: Pick<EditNoteForm, "id" | "title"> & { content?: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type EditNoteTitleForm = Pick<EditNoteForm, "title">;

const editNoteTitleSchema = editNoteSchema.pick({ title: true });

/**
 * Renders title-only note editing for compact list actions.
 *
 * @example
 * <EditNoteTitleDialog note={note} open onOpenChange={setOpen} onSuccess={refresh} />
 */
export function EditNoteTitleDialog({
  note,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<EditNoteTitleDialogProps>) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<EditNoteTitleForm>({
    resolver: zodResolver(editNoteTitleSchema),
    defaultValues: { title: note.title },
    values: { title: note.title },
  });

  async function handleSubmit(data: EditNoteTitleForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await editNote({
        id: note.id,
        title: data.title,
        content: note.content ?? undefined,
      });

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ title: note.title });
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription className="sr-only">
            Update the note.
          </DialogDescription>
        </DialogHeader>
        <form id="form-edit-note" onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-note-title-input">
                    Title
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-note-title-input"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel="Save Title"
                pendingLabel="Saving..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
