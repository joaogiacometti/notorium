import {
  type DueDateFilter,
  filterAndSortAssessments,
  type SortBy,
  type StatusFilter,
  type TypeFilter,
} from "@/features/assessments/assessment-filters";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

interface DueDateBounds {
  next30DaysIso: string;
  next7DaysIso: string;
  todayIso: string;
}

interface DerivePlanningAssessmentsTableStateInput {
  assessments: AssessmentEntity[];
  dueDateBounds: DueDateBounds;
  dueDateFilter: DueDateFilter;
  page: number;
  pageSize: number;
  searchQuery: string;
  sortBy: SortBy;
  statusFilter: StatusFilter;
  subjectFilter: string;
  typeFilter: TypeFilter;
}

export function derivePlanningAssessmentsTableState({
  assessments,
  dueDateBounds,
  dueDateFilter,
  page,
  pageSize,
  searchQuery,
  sortBy,
  statusFilter,
  subjectFilter,
  typeFilter,
}: DerivePlanningAssessmentsTableStateInput) {
  const filteredAssessments = filterAndSortAssessments({
    assessments,
    dueDateBounds,
    dueDateFilter,
    searchQuery,
    sortBy,
    statusFilter,
    subjectFilter,
    typeFilter,
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssessments.length / pageSize),
  );
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;

  return {
    clampedPage,
    filteredAssessments,
    paginatedAssessments: filteredAssessments.slice(
      startIndex,
      startIndex + pageSize,
    ),
    totalPages,
  };
}
