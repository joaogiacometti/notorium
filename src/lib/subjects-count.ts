export interface SubjectCountOptions {
  activeCount: number;
  archivedCount: number;
  maxSubjects: number | null;
}

export function getTotalSubjectCount(
  activeCount: number,
  archivedCount: number,
): number {
  return activeCount + archivedCount;
}

export function getSubjectCountText({
  activeCount,
  archivedCount,
  maxSubjects,
}: SubjectCountOptions): string {
  const totalSubjects = getTotalSubjectCount(activeCount, archivedCount);

  if (totalSubjects === 0) {
    return "Get started by creating your first subject.";
  }

  if (maxSubjects !== null) {
    return archivedCount > 0
      ? `${totalSubjects}/${maxSubjects} subjects (${archivedCount} archived)`
      : `${totalSubjects}/${maxSubjects} subjects`;
  }

  return `${totalSubjects} subject${totalSubjects === 1 ? "" : "s"}`;
}
