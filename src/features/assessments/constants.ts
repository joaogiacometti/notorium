import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getStatusToneClasses, type StatusTone } from "@/lib/ui/status-tones";

export const assessmentTypeValues = [
  "exam",
  "assignment",
  "project",
  "presentation",
  "homework",
  "other",
] as const;

export const assessmentStatusValues = ["pending", "completed"] as const;

export const planningAssessmentStatusFilterValues = [
  "all",
  "pending",
  "completed",
  "overdue",
] as const;
export const planningAssessmentTypeFilterValues = [
  "all",
  ...assessmentTypeValues,
] as const;
export const planningAssessmentSortValues = [
  "smart",
  "dueDateAsc",
  "dueDateDesc",
  "updatedAtDesc",
  "scoreDesc",
] as const;

export type AssessmentType = (typeof assessmentTypeValues)[number];
export type AssessmentStatus = "overdue" | "completed" | "pending";

export type ResolvedAssessmentStatus = AssessmentStatus;

export function resolveAssessmentStatus(
  overdue: boolean,
  status: AssessmentEntity["status"],
): ResolvedAssessmentStatus {
  if (overdue) return "overdue";
  if (status === "completed") return "completed";
  return "pending";
}

export const ASSESSMENT_STATUS_TONE = {
  overdue: getStatusToneClasses("danger"),
  completed: getStatusToneClasses("success"),
  pending: getStatusToneClasses("warning"),
} as const;

export const ASSESSMENT_STATUS_TONE_NAME: Record<
  ResolvedAssessmentStatus,
  StatusTone
> = {
  overdue: "danger",
  completed: "success",
  pending: "warning",
} as const;

export const ASSESSMENT_STATUS_LABEL = {
  overdue: "Overdue",
  completed: "Completed",
  pending: "Pending",
} as const;

export function getAssessmentTypeLabel(value: string): string {
  switch (value) {
    case "exam":
      return "Exam";
    case "assignment":
      return "Assignment";
    case "project":
      return "Project";
    case "presentation":
      return "Presentation";
    case "homework":
      return "Homework";
    default:
      return "Other";
  }
}
