import { addDays, format } from "date-fns";
import { isAssessmentOverdue } from "@/features/assessments/assessments";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

export type StatusFilter = "all" | "pending" | "completed" | "overdue";
export type TypeFilter =
  | "all"
  | "exam"
  | "assignment"
  | "project"
  | "presentation"
  | "homework"
  | "other";
export type DueDateFilter =
  | "all"
  | "past"
  | "today"
  | "next7Days"
  | "next30Days"
  | "none";
export type SortBy =
  | "smart"
  | "dueDateAsc"
  | "dueDateDesc"
  | "updatedAtDesc"
  | "scoreDesc";

interface DueDateBounds {
  todayIso: string;
  next7DaysIso: string;
  next30DaysIso: string;
}

interface FilterAndSortAssessmentsInput {
  assessments: AssessmentEntity[];
  searchQuery: string;
  subjectFilter: string;
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  dueDateFilter: DueDateFilter;
  sortBy: SortBy;
  dueDateBounds: DueDateBounds;
}

export function getDueDateBounds(now = new Date()): DueDateBounds {
  const todayIso = format(now, "yyyy-MM-dd");

  return {
    todayIso,
    next7DaysIso: format(addDays(now, 7), "yyyy-MM-dd"),
    next30DaysIso: format(addDays(now, 30), "yyyy-MM-dd"),
  };
}

export function getSubjectFilterOptions(
  assessments: AssessmentEntity[],
  subjectNamesById?: Record<string, string>,
): string[] {
  return Array.from(new Set(assessments.map((item) => item.subjectId))).filter(
    (subjectId) =>
      subjectNamesById?.[subjectId] !== undefined || !subjectNamesById,
  );
}

export function filterAndSortAssessments({
  assessments,
  searchQuery,
  subjectFilter,
  statusFilter,
  typeFilter,
  dueDateFilter,
  sortBy,
  dueDateBounds,
}: FilterAndSortAssessmentsInput): AssessmentEntity[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return sortAssessments(
    assessments.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : item.title.toLowerCase().includes(normalizedSearch) ||
            item.description?.toLowerCase().includes(normalizedSearch) === true;
      const subjectMatches =
        subjectFilter === "all" ? true : item.subjectId === subjectFilter;
      const overdue = isAssessmentOverdue(item, dueDateBounds.todayIso);

      const statusMatches =
        statusFilter === "all"
          ? true
          : statusFilter === "overdue"
            ? overdue
            : item.status === statusFilter;

      const typeMatches =
        typeFilter === "all" ? true : item.type === typeFilter;

      const dueDateMatches = isInDueDateWindow(
        item,
        dueDateFilter,
        dueDateBounds,
      );

      return (
        matchesSearch &&
        subjectMatches &&
        statusMatches &&
        typeMatches &&
        dueDateMatches
      );
    }),
    sortBy,
  );
}

function sortAssessments(
  items: AssessmentEntity[],
  sortBy: SortBy,
): AssessmentEntity[] {
  const sorted = [...items];

  if (sortBy === "updatedAtDesc") {
    return sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  if (sortBy === "dueDateAsc") {
    return sorted.sort((a, b) => {
      if (a.dueDate === null && b.dueDate === null) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      if (a.dueDate === null) {
        return 1;
      }
      if (b.dueDate === null) {
        return -1;
      }
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  if (sortBy === "dueDateDesc") {
    return sorted.sort((a, b) => {
      if (a.dueDate === null && b.dueDate === null) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      if (a.dueDate === null) {
        return 1;
      }
      if (b.dueDate === null) {
        return -1;
      }
      if (a.dueDate !== b.dueDate) {
        return b.dueDate.localeCompare(a.dueDate);
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  if (sortBy === "scoreDesc") {
    return sorted.sort((a, b) => {
      if (a.score === null && b.score === null) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      if (a.score === null) {
        return 1;
      }
      if (b.score === null) {
        return -1;
      }
      return Number(b.score) - Number(a.score);
    });
  }

  return sorted.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "pending" ? -1 : 1;
    }

    if (a.status === "pending" && b.status === "pending") {
      if (a.dueDate === null && b.dueDate === null) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      if (a.dueDate === null) {
        return 1;
      }
      if (b.dueDate === null) {
        return -1;
      }
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }

    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

function isInDueDateWindow(
  item: AssessmentEntity,
  dueDateFilter: DueDateFilter,
  dueDateBounds: DueDateBounds,
): boolean {
  if (dueDateFilter === "all") {
    return true;
  }

  if (dueDateFilter === "none") {
    return item.dueDate === null;
  }

  if (item.dueDate === null) {
    return false;
  }

  if (dueDateFilter === "past") {
    return item.dueDate < dueDateBounds.todayIso;
  }

  if (dueDateFilter === "today") {
    return item.dueDate === dueDateBounds.todayIso;
  }

  if (dueDateFilter === "next7Days") {
    return (
      item.dueDate >= dueDateBounds.todayIso &&
      item.dueDate <= dueDateBounds.next7DaysIso
    );
  }

  return (
    item.dueDate >= dueDateBounds.todayIso &&
    item.dueDate <= dueDateBounds.next30DaysIso
  );
}
