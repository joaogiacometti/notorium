"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createNote } from "@/app/actions/notes";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  type CreateNoteForm,
  createNoteSchema,
} from "@/features/notes/validation";
import { t } from "@/lib/server/server-action-errors";

interface CreateNoteTitleDialogProps {
  subjectId: string;
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (noteId: string) => void;
}

type CreateNoteTitleForm = Pick<CreateNoteForm, "title">;

const createNoteTitleSchema = createNoteSchema.pick({ title: true });

export function CreateNoteTitleDialog({
  subjectId,
  trigger,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<CreateNoteTitleDialogProps>) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateNoteTitleForm>({
    resolver: zodResolver(createNoteTitleSchema),
    defaultValues: { title: "" },
  });

  async function handleSubmit(data: CreateNoteTitleForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createNote({
        subjectId,
        title: data.title,
        content: "",
      });

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      form.reset({ title: "" });
      onOpenChange(false);
      onSuccess(result.noteId);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ title: "" });
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Note</DialogTitle>
          <DialogDescription className="sr-only">
            Create a note with a title.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-create-note-title"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-note-title-input">
                    Title
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-note-title-input"
                    placeholder="e.g. Chapter 3 Summary"
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
                idleLabel="Create Note"
                pendingLabel="Creating..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
