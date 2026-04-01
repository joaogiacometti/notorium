"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { editAssessment } from "@/app/actions/assessments";
import { AssessmentDialogForm } from "@/components/assessments/assessment-dialog-form";
import {
  type EditAssessmentForm,
  type EditAssessmentFormInput,
  editAssessmentSchema,
} from "@/features/assessments/validation";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface EditAssessmentDialogProps {
  assessment: AssessmentEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (assessment: AssessmentEntity) => void;
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
  onUpdated,
}: Readonly<EditAssessmentDialogProps>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<EditAssessmentFormInput, unknown, EditAssessmentForm>({
    resolver: zodResolver(editAssessmentSchema),
    defaultValues: getEditAssessmentFormValues(assessment),
  });

  useEffect(() => {
    form.reset(getEditAssessmentFormValues(assessment));
  }, [assessment, form]);

  async function onSubmit(data: EditAssessmentForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await editAssessment(data);
      if (result.success) {
        onUpdated?.(result.assessment);
        onOpenChange(false);
      } else {
        form.setError("title", {
          message: resolveActionErrorMessage(result),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AssessmentDialogForm
      form={form}
      formId="form-edit-assessment"
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Assessment"
      description="Update details, status, dates, and grading values."
      submitLabel="Save Changes"
      pendingSubmitLabel="Saving..."
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
