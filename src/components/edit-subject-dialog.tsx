"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editSubject } from "@/app/actions/subjects";
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
import type { SubjectEditDto } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import {
  type EditSubjectForm,
  editSubjectSchema,
} from "@/lib/validations/subjects";

interface EditSubjectDialogProps {
  subject: SubjectEditDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSubjectDialog({
  subject,
  open,
  onOpenChange,
}: Readonly<EditSubjectDialogProps>) {
  const t = useTranslations("EditSubjectDialog");
  const _tSubject = useTranslations("CreateSubjectDialog");
  const tErrors = useTranslations("ServerActions");
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(editSubjectSchema),
    defaultValues: {
      id: subject.id,
      name: subject.name,
      description: subject.description ?? "",
    },
  });

  async function onSubmit(data: EditSubjectForm) {
    const result = await editSubject(data);
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      onOpenChange(false);
    } else {
      toast.error(resolveActionErrorMessage(result, tErrors));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form id="form-edit-subject" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-subject-name">
                    {_tSubject("field_name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-subject-name"
                    placeholder={_tSubject("field_name_placeholder")}
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
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-subject-description">
                    {_tSubject("field_description")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-edit-subject-description"
                    placeholder={_tSubject("field_description_placeholder")}
                    rows={3}
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
              form="form-edit-subject"
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
  );
}
