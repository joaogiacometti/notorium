"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { createAssessment } from "@/app/actions/assessments";
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
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import {
  type CreateAssessmentForm,
  createAssessmentSchema,
} from "@/lib/validations/assessments";

interface CreateAssessmentDialogProps {
  subjectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const assessmentTypes = [
  { value: "exam", label: "Exam" },
  { value: "assignment", label: "Assignment" },
  { value: "project", label: "Project" },
  { value: "presentation", label: "Presentation" },
  { value: "homework", label: "Homework" },
  { value: "other", label: "Other" },
] as const;

export function CreateAssessmentDialog({
  subjectId,
  open,
  onOpenChange,
}: Readonly<CreateAssessmentDialogProps>) {
  const t = useTranslations("CreateAssessmentDialog");
  const tErrors = useTranslations("ServerActions");
  const form = useForm({
    resolver: zodResolver(createAssessmentSchema),
    defaultValues: {
      subjectId,
      title: "",
      description: "",
      type: "other",
      status: "pending",
      dueDate: undefined,
      score: undefined,
      weight: undefined,
    },
  });

  async function onSubmit(data: CreateAssessmentForm) {
    const result = await createAssessment(data);
    if (result.success) {
      form.reset({
        subjectId,
        title: "",
        description: "",
        type: "other",
        status: "pending",
        dueDate: undefined,
        score: undefined,
        weight: undefined,
      });
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
          id="form-create-assessment"
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-h-[70vh] overflow-y-auto pr-1"
        >
          <FieldGroup className="gap-4">
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-create-assessment-title">
                    Title
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-create-assessment-title"
                    placeholder="e.g. Midterm 1"
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
                  <FieldLabel htmlFor="form-create-assessment-description">
                    Description (optional)
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-create-assessment-description"
                    placeholder="Extra details..."
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
                  <FieldLabel htmlFor="form-create-assessment-type">
                    Type
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
                      id="form-create-assessment-type"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assessmentTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
                  <FieldLabel htmlFor="form-create-assessment-status">
                    Status
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
                      id="form-create-assessment-status"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        {t("field_status_pending")}
                      </SelectItem>
                      <SelectItem value="completed">
                        {t("field_status_completed")}
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
                  <FieldLabel htmlFor="form-create-assessment-due-date">
                    Due Date (optional)
                  </FieldLabel>
                  <Input
                    id="form-create-assessment-due-date"
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
                  <FieldLabel htmlFor="form-create-assessment-score">
                    Score (optional)
                  </FieldLabel>
                  <Input
                    id="form-create-assessment-score"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder="e.g. 84"
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
                  <FieldLabel htmlFor="form-create-assessment-weight">
                    Weight (optional)
                  </FieldLabel>
                  <Input
                    id="form-create-assessment-weight"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder="e.g. 40"
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
              form="form-create-assessment"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Add Assessment
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
