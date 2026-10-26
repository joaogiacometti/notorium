/**
 * Keeps a `subjectId` search param only when it names one of the user's
 * subjects, so a stale or foreign id falls back to the unscoped view.
 *
 * @example
 * const scopedSubjectId = resolveScopedSubjectId(subjects, params.subjectId);
 */
export function resolveScopedSubjectId(
  subjects: ReadonlyArray<{ id: string }>,
  subjectId: string | undefined,
): string | undefined {
  if (!subjectId) {
    return undefined;
  }

  return subjects.some((subject) => subject.id === subjectId)
    ? subjectId
    : undefined;
}
