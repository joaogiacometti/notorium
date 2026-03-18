"use client";

import { useTranslations } from "next-intl";
import {
  Controller,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { SubjectText } from "@/components/shared/subject-text";
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
import { assessmentTypeValues } from "@/features/assessments/constants";
import type {
  CreateAssessmentFormInput,
  EditAssessmentFormInput,
} from "@/features/assessments/validation";
import type { SubjectEntity } from "@/lib/server/api-contracts";

type AssessmentSharedFormValues = Pick<
  CreateAssessmentFormInput,
  "title" | "description" | "type" | "status" | "dueDate" | "score" | "weight"
> &
  Partial<Pick<CreateAssessmentFormInput, "subjectId">> &
  Partial<Pick<EditAssessmentFormInput, "id">>;

interface AssessmentDialogFormProps<
  TValues extends FieldValues & AssessmentSharedFormValues,
  TSubmitValues extends FieldValues & AssessmentSharedFormValues,
> {
  form: UseFormReturn<TValues, unknown, TSubmitValues>;
  formId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  pendingSubmitLabel: string;
  onSubmit: (values: TSubmitValues) => Promise<void>;
  subjects?: SubjectEntity[];
}

export function AssessmentDialogForm<
  TValues extends FieldValues & AssessmentSharedFormValues,
  TSubmitValues extends FieldValues & AssessmentSharedFormValues,
>({
  form,
  formId,
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  pendingSubmitLabel,
  onSubmit,
  subjects,
}: Readonly<AssessmentDialogFormProps<TValues, TSubmitValues>>) {
  const t = useTranslations("CreateAssessmentDialog");
  const tAssessment = useTranslations("AssessmentItemCard");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-h-[70vh] overflow-y-auto pr-1"
        >
          <FieldGroup className="gap-4">
            {subjects && subjects.length > 0 ? (
              <Controller
                name={"subjectId" as FieldPath<TValues>}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-subject`}>
                      {t("field_subject")}
                    </FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      onOpenChange={(nextOpen) => {
                        if (!nextOpen) {
                          field.onBlur();
                        }
                      }}
                    >
                      <SelectTrigger
                        id={`${formId}-subject`}
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue
                          placeholder={t("field_subject_placeholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            <SubjectText
                              value={subject.name}
                              mode="truncate"
                              className="block max-w-full"
                            />
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
            ) : null}
            <Controller
              name={"title" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-title`}>
                    {t("field_title")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${formId}-title`}
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
              name={"description" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-description`}>
                    {t("field_description")}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={`${formId}-description`}
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
              name={"type" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-type`}>
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
                      id={`${formId}-type`}
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assessmentTypeValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tAssessment(`type_${value}`)}
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
              name={"status" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-status`}>
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
                      id={`${formId}-status`}
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
              name={"dueDate" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-due-date`}>
                    {t("field_due_date")}
                  </FieldLabel>
                  <Input
                    id={`${formId}-due-date`}
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
              name={"score" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-score`}>
                    {t("field_score")}
                  </FieldLabel>
                  <Input
                    id={`${formId}-score`}
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
              name={"weight" as FieldPath<TValues>}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${formId}-weight`}>
                    {t("field_weight")}
                  </FieldLabel>
                  <Input
                    id={`${formId}-weight`}
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
              form={formId}
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              <AsyncButtonContent
                pending={form.formState.isSubmitting}
                idleLabel={submitLabel}
                pendingLabel={pendingSubmitLabel}
              />
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
