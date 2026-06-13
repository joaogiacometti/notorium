"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
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
import {
  DEFAULT_SUBJECT_KIND,
  getSubjectKindDescription,
  getSubjectKindLabel,
  type SubjectKind,
  subjectKindValues,
} from "@/features/subjects/constants";
import {
  type CreateSubjectForm,
  createSubjectSchema,
  type EditSubjectForm,
  editSubjectSchema,
} from "@/features/subjects/validation";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { t } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";

type SubjectFormValues = CreateSubjectForm | EditSubjectForm;

interface SubjectKindOptionProps {
  kind: SubjectKind;
  selected: boolean;
  onSelect: (kind: SubjectKind) => void;
}

function SubjectKindOption({
  kind,
  selected,
  onSelect,
}: Readonly<SubjectKindOptionProps>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(kind)}
      className={cn(
        "flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {getSubjectKindLabel(kind)}
      </span>
      <span className="text-xs text-muted-foreground">
        {getSubjectKindDescription(kind)}
      </span>
    </button>
  );
}

interface SubjectDialogFormProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  values: SubjectFormValues;
  onSubmitAction: (
    values: SubjectFormValues,
  ) => Promise<{ success: true } | ActionErrorResult>;
  onSuccess?: (values: SubjectFormValues) => void;
}

function useSubjectForm(
  mode: "create" | "edit",
  values: SubjectFormValues,
): UseFormReturn<SubjectFormValues> {
  return useForm<SubjectFormValues>({
    resolver: zodResolver(
      mode === "create" ? createSubjectSchema : editSubjectSchema,
    ),
    defaultValues: values,
  });
}

export function SubjectDialogForm({
  mode,
  open,
  onOpenChange,
  trigger,
  values,
  onSubmitAction,
  onSuccess,
}: Readonly<SubjectDialogFormProps>) {
  const queryClient = useQueryClient();
  const form = useSubjectForm(mode, values);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    form.reset(values);
  }, [form, values]);

  async function onSubmit(data: SubjectFormValues) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmitAction(data);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["search-data"] });
        form.reset(
          mode === "create" ? { name: "", kind: DEFAULT_SUBJECT_KIND } : data,
        );
        onOpenChange(false);
        onSuccess?.(data);
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    } finally {
      setIsSubmitting(false);
    }
  }

  const formId =
    mode === "create" ? "form-create-subject" : "form-edit-subject";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Subject" : "Edit Subject"}
          </DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={`${formId}-name`}
                    placeholder="e.g. Calculus I"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Controller
              name="kind"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={`${formId}-kind`}>Type</FieldLabel>
                  <div id={`${formId}-kind`} className="grid grid-cols-2 gap-2">
                    {subjectKindValues.map((kind) => (
                      <SubjectKindOption
                        key={kind}
                        kind={kind}
                        selected={field.value === kind}
                        onSelect={field.onChange}
                      />
                    ))}
                  </div>
                </Field>
              )}
            />
            <Button
              type="submit"
              form={formId}
              disabled={isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={isSubmitting}
                idleLabel={
                  mode === "create" ? "Create Subject" : "Save Changes"
                }
                pendingLabel={mode === "create" ? "Creating..." : "Saving..."}
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
