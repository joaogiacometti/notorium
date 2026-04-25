import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getStatusToneClasses, type StatusTone } from "@/lib/ui/status-tones";

export type AssessmentStatus = "overdue" | "completed" | "pending";

export function resolveAssessmentStatus(
  overdue: boolean,
  status: AssessmentEntity["status"],
): AssessmentStatus {
  if (overdue) return "overdue";
  if (status === "completed") return "completed";
  return "pending";
}

export const ASSESSMENT_STATUS_TONE = {
  overdue: getStatusToneClasses("danger"),
  completed: getStatusToneClasses("success"),
  pending: getStatusToneClasses("warning"),
} as const;

export const ASSESSMENT_STATUS_TONE_NAME: Record<AssessmentStatus, StatusTone> =
  {
    overdue: "danger",
    completed: "success",
    pending: "warning",
  } as const;

export const ASSESSMENT_STATUS_LABEL = {
  overdue: "Overdue",
  completed: "Completed",
  pending: "Pending",
} as const;
