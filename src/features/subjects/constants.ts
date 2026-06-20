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

/**
 * The detail-page href for a subject, or `null` when the subject has no page.
 * Only academic subjects have a page (their attendance/assessment dashboard);
 * general subjects are pure containers that live only in the sidebar tree, so
 * they are never linked to. Use this everywhere a subject could be rendered as
 * a navigation target so the rule stays consistent.
 *
 * @example getSubjectPageHref({ id: "s1", kind: "general" }) // null
 */
export function getSubjectPageHref(subject: {
  id: string;
  kind: SubjectKind;
}): string | null {
  return isAcademicSubject(subject.kind) ? `/subjects/${subject.id}` : null;
}
