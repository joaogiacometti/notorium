"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Controller, type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import type { ActionErrorResult } from "@/lib/server-action-errors";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import {
  type CreateSubjectForm,
  createSubjectSchema,
  type EditSubjectForm,
  editSubjectSchema,
} from "@/lib/validations/subjects";

type SubjectFormValues = CreateSubjectForm | EditSubjectForm;

interface SubjectDialogFormProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  values: SubjectFormValues;
  onSubmitAction: (
    values: SubjectFormValues,
  ) => Promise<{ success: true } | ActionErrorResult>;
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
}: Readonly<SubjectDialogFormProps>) {
  const t = useTranslations(
    mode === "create" ? "CreateSubjectDialog" : "EditSubjectDialog",
  );
  const tFields = useTranslations("CreateSubjectDialog");
  const tErrors = useTranslations("ServerActions");
  const queryClient = useQueryClient();
  const form = useSubjectForm(mode, values);

  useEffect(() => {
    form.reset(values);
  }, [form, values]);

  async function onSubmit(data: SubjectFormValues) {
    const result = await onSubmitAction(data);
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      form.reset(mode === "create" ? { name: "", description: "" } : data);
      onOpenChange(false);
      return;
    }

    toast.error(resolveActionErrorMessage(result, tErrors));
  }

  const formId =
    mode === "create" ? "form-create-subject" : "form-edit-subject";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-name`}>
                    {tFields("field_name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${formId}-name`}
                    placeholder={tFields("field_name_placeholder")}
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
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-description`}>
                    {tFields("field_description")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`${formId}-description`}
                    placeholder={tFields("field_description_placeholder")}
                    rows={3}
                    className="resize-none"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
            <Button
              type="submit"
              form={formId}
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("submit")}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
