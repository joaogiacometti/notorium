/**
 * Subject kinds separate academic subjects, which expose attendance and
 * assessment tracking, from general subjects, which keep only notes and
 * mindmaps so non-academic users are not forced into study-tracking features.
 */
export const subjectKindValues = ["academic", "general"] as const;

export type SubjectKind = (typeof subjectKindValues)[number];

const SUBJECT_KIND_LABELS: Record<SubjectKind, string> = {
  academic: "Academic",
  general: "General",
};

const SUBJECT_KIND_DESCRIPTIONS: Record<SubjectKind, string> = {
  academic: "Track attendance and assessments alongside documents.",
  general: "Just notes and mindmaps, without attendance or assessments.",
};

export const DEFAULT_SUBJECT_KIND: SubjectKind = "academic";

/**
 * Returns the display label for a subject kind.
 *
 * @example getSubjectKindLabel("general") // "General"
 */
export function getSubjectKindLabel(kind: SubjectKind): string {
  return SUBJECT_KIND_LABELS[kind];
}

/**
 * Returns the short helper description shown next to a subject kind option.
 *
 * @example getSubjectKindDescription("academic")
 */
export function getSubjectKindDescription(kind: SubjectKind): string {
  return SUBJECT_KIND_DESCRIPTIONS[kind];
}

/**
 * Whether a subject exposes attendance and assessment features.
 *
 * @example isAcademicSubject("academic") // true
 */
export function isAcademicSubject(kind: SubjectKind): boolean {
  return kind === "academic";
}
