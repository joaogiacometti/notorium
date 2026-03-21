"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { EditAssessmentDialog as EditAssessmentDialogType } from "@/components/assessments/edit-assessment-dialog";

type LazyEditAssessmentDialogProps = ComponentProps<
  typeof EditAssessmentDialogType
>;

export const LazyEditAssessmentDialog = dynamic<LazyEditAssessmentDialogProps>(
  () =>
    import("@/components/assessments/edit-assessment-dialog").then(
      (m) => m.EditAssessmentDialog,
    ),
  { ssr: false },
);
