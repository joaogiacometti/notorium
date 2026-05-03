import type {
  SortBy,
  StatusFilter,
  TypeFilter,
} from "@/features/assessments/assessment-filters";

/**
 * Builds canonical `/planning?view=assessments` query params for assessment filters.
 *
 * @example
 * buildPlanningAssessmentsParams("subject-1", "midterm", "pending", "exam", "dueDateAsc")
 */
export function buildPlanningAssessmentsParams(
  currentSubject: string,
  currentSearch: string,
  currentStatus: StatusFilter,
  currentType: TypeFilter,
  currentSort: SortBy,
): string {
  const query = new URLSearchParams();
  query.set("view", "assessments");

  if (currentSubject !== "all") {
    query.set("subject", currentSubject);
  }
  if (currentSearch) {
    query.set("search", currentSearch);
  }
  if (currentStatus !== "all") {
    query.set("status", currentStatus);
  }
  if (currentType !== "all") {
    query.set("type", currentType);
  }
  if (currentSort !== "smart") {
    query.set("sort", currentSort);
  }

  return query.toString();
}
