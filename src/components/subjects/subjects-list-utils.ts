import type { SubjectListItem } from "@/lib/server/api-contracts";

export type SubjectsStatusFilter = "active" | "archived";
export type SubjectsSort = "updatedDesc" | "nameAsc";

export function isArchived(subject: SubjectListItem): boolean {
  return subject.archivedAt !== null;
}

function matchesStatus(
  subject: SubjectListItem,
  status: SubjectsStatusFilter,
): boolean {
  if (status === "archived") return isArchived(subject);
  return !isArchived(subject);
}

function matchesSearch(subject: SubjectListItem, searchQuery: string): boolean {
  if (!searchQuery) return true;

  return subject.name.toLowerCase().includes(searchQuery);
}

function compareSubjects(
  left: SubjectListItem,
  right: SubjectListItem,
  sortBy: SubjectsSort,
): number {
  if (sortBy === "nameAsc") return left.name.localeCompare(right.name);

  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

export function getVisibleSubjects(
  subjects: SubjectListItem[],
  status: SubjectsStatusFilter,
  searchQuery: string,
  sortBy: SubjectsSort,
): SubjectListItem[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return [...subjects]
    .filter((subject) => matchesStatus(subject, status))
    .filter((subject) => matchesSearch(subject, normalizedSearch))
    .sort((left, right) => compareSubjects(left, right, sortBy));
}

export function getColumnClassName(columnId: string): string {
  switch (columnId) {
    case "select":
      return "w-8 min-w-8 sm:w-9 sm:min-w-9";
    case "subject":
      return "min-w-0 max-w-[8.5rem] sm:min-w-[12rem] sm:max-w-none";
    case "notesCount":
      return "w-16 min-w-16 sm:w-[4.5rem] sm:min-w-[4.5rem]";
    case "actions":
      return "w-10 min-w-10 sm:w-14 sm:min-w-14";
    default:
      return "";
  }
}

export function getSelectedSubjects(
  subjects: SubjectListItem[],
  selectedSubjectIds: string[],
): SubjectListItem[] {
  const selectedIds = new Set(selectedSubjectIds);

  return subjects.filter((subject) => selectedIds.has(subject.id));
}

export function getSubjectPageItems(
  subjects: SubjectListItem[],
  pageIndex: number,
  pageSize: number,
): SubjectListItem[] {
  const startIndex = pageIndex * pageSize;

  return subjects.slice(startIndex, startIndex + pageSize);
}

export function formatNotesCount(notesCount: number): string {
  return notesCount === 1 ? "1 note" : `${notesCount} notes`;
}

export function getSubjectsHref(status: SubjectsStatusFilter): string {
  if (status === "active") {
    return "/subjects";
  }

  return `/subjects?status=${status}`;
}
