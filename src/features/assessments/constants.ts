export const assessmentTypeValues = [
  "exam",
  "assignment",
  "project",
  "presentation",
  "homework",
  "other",
] as const;

export const assessmentStatusValues = ["pending", "completed"] as const;

export type AssessmentType = (typeof assessmentTypeValues)[number];
export type AssessmentStatus = (typeof assessmentStatusValues)[number];
