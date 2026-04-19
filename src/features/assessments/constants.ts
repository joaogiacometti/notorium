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
export type AssessmentStatus = (typeof assessmentStatusValues)[number];

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
