"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { editAssessment } from "@/app/actions/assessments";
import { AssessmentDialogForm } from "@/components/assessment-dialog-form";
import type { AssessmentEntity } from "@/lib/api/contracts";
import { resolveActionErrorMessage } from "@/lib/server-action-errors";
import {
  type EditAssessmentForm,
  type EditAssessmentFormInput,
  editAssessmentSchema,
} from "@/lib/validations/assessments";

interface EditAssessmentDialogProps {
  assessment: AssessmentEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getEditAssessmentFormValues(
  assessment: AssessmentEntity,
): EditAssessmentForm {
  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description ?? "",
    type: assessment.type,
    status: assessment.status,
    dueDate: assessment.dueDate ?? undefined,
    score: assessment.score === null ? undefined : Number(assessment.score),
    weight: assessment.weight === null ? undefined : Number(assessment.weight),
  };
}

export function EditAssessmentDialog({
  assessment,
  open,
  onOpenChange,
}: Readonly<EditAssessmentDialogProps>) {
  const t = useTranslations("EditAssessmentDialog");
  const tErrors = useTranslations("ServerActions");
  const form = useForm<EditAssessmentFormInput, unknown, EditAssessmentForm>({
    resolver: zodResolver(editAssessmentSchema),
    defaultValues: getEditAssessmentFormValues(assessment),
  });

  useEffect(() => {
    form.reset(getEditAssessmentFormValues(assessment));
  }, [assessment, form]);

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
    <AssessmentDialogForm
      form={form}
      formId="form-edit-assessment"
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      submitLabel={t("submit")}
      onSubmit={onSubmit}
    />
  );
}
