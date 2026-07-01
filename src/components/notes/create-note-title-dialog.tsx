"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createNote } from "@/app/actions/notes";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectSelect } from "@/components/shared/subject-select";
import { useCreateGeneralSubjectPicker } from "@/components/shared/use-create-general-subject-picker";
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
import type { SubjectOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface CreateNoteTitleDialogProps {
  subjectId?: string;
  subjects?: SubjectOption[];
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (noteId: string, subjectId: string) => void;
}

export function CreateNoteTitleDialog({
  subjectId,
  subjects: initialSubjects,
  trigger,
  open,
  onOpenChange,
  onSuccess,
}: Readonly<CreateNoteTitleDialogProps>) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateNoteForm>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: { subjectId: subjectId ?? "", title: "", content: "" },
  });
  const { subjects, handleCreateSubject } = useCreateGeneralSubjectPicker({
    initialSubjects,
    onSubjectCreated: (createdSubjectId) =>
      form.setValue("subjectId", createdSubjectId, {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  useEffect(() => {
    if (open) {
      form.reset({ subjectId: subjectId ?? "", title: "", content: "" });
    }
  }, [form, open, subjectId]);

  async function handleSubmit(data: CreateNoteForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createNote({
        subjectId: data.subjectId,
        title: data.title,
        content: "",
      });

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      form.reset({ subjectId: subjectId ?? "", title: "", content: "" });
      onOpenChange(false);
      onSuccess(result.noteId, data.subjectId);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ subjectId: subjectId ?? "", title: "", content: "" });
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
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
            {initialSubjects ? (
              <Controller
                name="subjectId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <SubjectSelect
                    value={field.value}
                    onChange={(value) => field.onChange(value ?? "")}
                    subjects={subjects}
                    id="form-create-note-subject"
                    error={fieldState.error?.message}
                    ariaInvalid={fieldState.invalid}
                    onCreateSubject={handleCreateSubject}
                  />
                )}
              />
            ) : null}
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
