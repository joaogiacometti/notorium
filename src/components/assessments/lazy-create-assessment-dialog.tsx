"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { CreateAssessmentDialog as CreateAssessmentDialogType } from "@/components/assessments/create-assessment-dialog";

type LazyCreateAssessmentDialogProps = ComponentProps<
  typeof CreateAssessmentDialogType
>;

export const LazyCreateAssessmentDialog =
  dynamic<LazyCreateAssessmentDialogProps>(
    () =>
      import("@/components/assessments/create-assessment-dialog").then(
        (m) => m.CreateAssessmentDialog,
      ),
    { ssr: false },
  );
