import { LIMITS } from "@/lib/config/limits";

export function getTotalSubjectCount(
  activeCount: number,
  archivedCount: number,
): number {
  return activeCount + archivedCount;
}

export function formatSubjectCount(activeCount: number): string {
  if (activeCount === 0) {
    return "0 subjects";
  }
  if (activeCount === 1) {
    return "1 subject";
  }
  return `${activeCount} subjects`;
}

export function getSubjectCountWithLimitText(
  activeCount: number,
  archivedCount: number,
): string {
  const total = getTotalSubjectCount(activeCount, archivedCount);

  if (activeCount === 0 && archivedCount === 0) {
    return "No subjects yet";
  }

  const activeText = formatSubjectCount(activeCount);
  const totalText = `(${total}/${LIMITS.maxSubjects} total)`;

  return `${activeText} ${totalText}`;
}
