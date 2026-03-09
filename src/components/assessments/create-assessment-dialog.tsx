"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { createAssessment } from "@/app/actions/assessments";
import { AssessmentDialogForm } from "@/components/assessments/assessment-dialog-form";
import {
  type CreateAssessmentForm,
  type CreateAssessmentFormInput,
  createAssessmentSchema,
} from "@/features/assessments/validation";
import { resolveActionErrorMessage } from "@/lib/server/server-action-errors";

interface CreateAssessmentDialogProps {
  subjectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getCreateAssessmentFormValues(
  subjectId: string,
): CreateAssessmentForm {
  return {
    subjectId,
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
  open,
  onOpenChange,
}: Readonly<CreateAssessmentDialogProps>) {
  const t = useTranslations("CreateAssessmentDialog");
  const tErrors = useTranslations("ServerActions");
  const form = useForm<
    CreateAssessmentFormInput,
    unknown,
    CreateAssessmentForm
  >({
    resolver: zodResolver(createAssessmentSchema),
    defaultValues: getCreateAssessmentFormValues(subjectId),
  });

  async function onSubmit(data: CreateAssessmentForm) {
    const result = await createAssessment(data);
    if (result.success) {
      form.reset(getCreateAssessmentFormValues(subjectId));
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
      formId="form-create-assessment"
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      submitLabel={t("submit")}
      onSubmit={onSubmit}
    />
  );
}
