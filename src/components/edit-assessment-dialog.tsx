"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { editAssessment } from "@/app/actions/assessments";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentEntity } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import {
  type EditAssessmentForm,
  editAssessmentSchema,
} from "@/lib/validations/assessments";

interface EditAssessmentDialogProps {
  assessment: AssessmentEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const assessmentTypes = [
  { value: "exam" },
  { value: "assignment" },
  { value: "project" },
  { value: "presentation" },
  { value: "homework" },
  { value: "other" },
] as const;

export function EditAssessmentDialog({
  assessment,
  open,
  onOpenChange,
}: Readonly<EditAssessmentDialogProps>) {
  const t = useTranslations("EditAssessmentDialog");
  const tAssessment = useTranslations("AssessmentItemCard");
  const tErrors = useTranslations("ServerActions");
  const form = useForm({
    resolver: zodResolver(editAssessmentSchema),
    defaultValues: {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description ?? "",
      type: assessment.type,
      status: assessment.status,
      dueDate: assessment.dueDate ?? undefined,
      score: assessment.score === null ? undefined : Number(assessment.score),
      weight:
        assessment.weight === null ? undefined : Number(assessment.weight),
    },
  });

  async function onSubmit(data: EditAssessmentForm) {
    const result = await editAssessment(data);
    if (result.success) {
      onOpenChange(false);
    } else {
      form.setError("title", {
        message: resolveActionErrorMessage(result, tErrors),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form
          id="form-edit-assessment"
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-h-[70vh] overflow-y-auto pr-1"
        >
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-assessment-title">
                    {t("field_title")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-edit-assessment-title"
                    placeholder={t("field_title_placeholder")}
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
                  <FieldLabel htmlFor="form-edit-assessment-description">
                    {t("field_description")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-edit-assessment-description"
                    placeholder={t("field_description_placeholder")}
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
            <Controller
              name="type"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-assessment-type">
                    {t("field_type")}
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    onOpenChange={(nextOpen) => {
                      if (!nextOpen) {
                        field.onBlur();
                      }
                    }}
                  >
                    <SelectTrigger
                      id="form-edit-assessment-type"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assessmentTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {tAssessment(`type_${option.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="status"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-assessment-status">
                    {t("field_status")}
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    onOpenChange={(nextOpen) => {
                      if (!nextOpen) {
                        field.onBlur();
                      }
                    }}
                  >
                    <SelectTrigger
                      id="form-edit-assessment-status"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        {tAssessment("status_pending")}
                      </SelectItem>
                      <SelectItem value="completed">
                        {tAssessment("status_completed")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="dueDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-assessment-due-date">
                    {t("field_due_date")}
                  </FieldLabel>
                  <Input
                    id="form-edit-assessment-due-date"
                    type="date"
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? undefined
                          : event.target.value,
                      )
                    }
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="score"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-assessment-score">
                    {t("field_score")}
                  </FieldLabel>
                  <Input
                    id="form-edit-assessment-score"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder={t("field_score_placeholder")}
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? undefined
                          : event.target.valueAsNumber,
                      )
                    }
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="weight"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-edit-assessment-weight">
                    {t("field_weight")}
                  </FieldLabel>
                  <Input
                    id="form-edit-assessment-weight"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder={t("field_weight_placeholder")}
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? undefined
                          : event.target.valueAsNumber,
                      )
                    }
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Button
              type="submit"
              form="form-edit-assessment"
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
