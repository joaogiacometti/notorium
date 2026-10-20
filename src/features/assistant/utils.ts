interface SubjectPathOption {
  id: string;
  path: string;
}

/**
 * Id of the subject whose path matches the one the assistant proposed: exact
 * first, then ignoring case and spaces around "::", since models sometimes
 * re-space or re-case a path. `null` when the path is missing or unknown, so
 * the user picks the subject.
 *
 * @example
 * findProposedSubjectId([{ id: "s1", path: "Biology::Cells" }], "biology :: cells"); // "s1"
 */
export function findProposedSubjectId(
  subjects: SubjectPathOption[],
  proposedPath: string | undefined,
): string | null {
  if (!proposedPath) {
    return null;
  }

  const exact = subjects.find((subject) => subject.path === proposedPath);
  if (exact) {
    return exact.id;
  }

  const wanted = normalizeSubjectPath(proposedPath);
  const loose = subjects.find(
    (subject) => normalizeSubjectPath(subject.path) === wanted,
  );
  return loose?.id ?? null;
}

function normalizeSubjectPath(path: string): string {
  return path
    .split("::")
    .map((segment) => segment.trim().toLowerCase())
    .join("::");
}
