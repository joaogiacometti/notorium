"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createMindmap } from "@/app/actions/mindmaps";
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
  type CreateMindmapForm,
  createMindmapSchema,
} from "@/features/mindmaps/validation";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface CreateMindmapDialogProps {
  subjectId?: string;
  subjects?: SubjectOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (mindmapId: string, subjectId: string) => void;
  trigger?: React.ReactNode;
}

export function CreateMindmapDialog({
  subjectId,
  subjects: initialSubjects,
  open,
  onOpenChange,
  onSuccess,
  trigger,
}: Readonly<CreateMindmapDialogProps>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreateMindmapForm>({
    resolver: zodResolver(createMindmapSchema),
    defaultValues: { subjectId: subjectId ?? "", title: "" },
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
      form.reset({ subjectId: subjectId ?? "", title: "" });
    }
  }, [form, open, subjectId]);

  async function handleSubmit(data: CreateMindmapForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createMindmap({
        title: data.title,
        subjectId: data.subjectId,
      });

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      form.reset({ subjectId: subjectId ?? "", title: "" });
      onOpenChange(false);
      onSuccess(result.mindmapId, data.subjectId);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ subjectId: subjectId ?? "", title: "" });
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Mindmap</DialogTitle>
          <DialogDescription className="sr-only">
            Create a mindmap with a title.
          </DialogDescription>
        </DialogHeader>
        <form
          id="form-create-mindmap"
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
                    id="form-create-mindmap-subject"
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
                  <FieldLabel htmlFor="form-create-mindmap-input">
                    Title
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-mindmap-input"
                    placeholder="e.g. Cell Biology Overview"
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
                idleLabel="Create Mindmap"
                pendingLabel="Creating..."
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
