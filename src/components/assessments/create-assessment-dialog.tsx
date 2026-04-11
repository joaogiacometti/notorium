"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createAssessment } from "@/app/actions/assessments";
import { AssessmentDialogForm } from "@/components/assessments/assessment-dialog-form";
import {
  type CreateAssessmentForm,
  type CreateAssessmentFormInput,
  createAssessmentSchema,
} from "@/features/assessments/validation";
import type {
  AssessmentEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface CreateAssessmentDialogProps {
  subjectId?: string;
  subjects?: SubjectEntity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (assessment: AssessmentEntity) => void;
}

function getCreateAssessmentFormValues(
  subjectId?: string,
): CreateAssessmentForm {
  return {
    subjectId: subjectId ?? "",
    title: "",
    description: "",
    type: "other",
    status: "pending",
    dueDate: undefined,
    score: undefined,
    weight: undefined,
  };
}

export function CreateAssessmentDialog({
  subjectId,
  subjects,
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreateAssessmentDialogProps>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_isPending, _startTransition] = useTransition();
  const form = useForm<
    CreateAssessmentFormInput,
    unknown,
    CreateAssessmentForm
  >({
    resolver: zodResolver(createAssessmentSchema),
    defaultValues: getCreateAssessmentFormValues(subjectId),
  });

  useEffect(() => {
    form.reset(getCreateAssessmentFormValues(subjectId));
  }, [form, subjectId]);

  async function onSubmit(data: CreateAssessmentForm) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAssessment(data);
      if (result.success) {
        form.reset(getCreateAssessmentFormValues(subjectId));
        onCreated?.(result.assessment);
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
      formId="form-create-assessment"
      open={open}
      onOpenChange={onOpenChange}
      title="Add Assessment"
      description="Track an upcoming or completed assessment for this subject."
      submitLabel="Add Assessment"
      pendingSubmitLabel="Creating..."
      onSubmit={onSubmit}
      subjects={subjects}
      isSubmitting={isSubmitting}
    />
  );
}
