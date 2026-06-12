import type {
  SortBy,
  StatusFilter,
  TypeFilter,
} from "@/features/assessments/assessment-filters";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination/page-size";

interface AssessmentsParamsInput {
  pageSize: number;
  search: string;
  sortBy: SortBy;
  statusFilter: StatusFilter;
  subjectFilter: string;
  typeFilter: TypeFilter;
}

/**
 * Builds the planning assessments query string, omitting params that equal
 * their default so shareable URLs stay clean.
 *
 * @example
 *   buildAssessmentsParams({ subjectFilter: "s1", search: "exam", ... })
 *   // -> "view=assessments&subject=s1&search=exam"
 */
export function buildAssessmentsParams({
  pageSize,
  search,
  sortBy,
  statusFilter,
  subjectFilter,
  typeFilter,
}: Readonly<AssessmentsParamsInput>): string {
  const query = new URLSearchParams({ view: "assessments" });

  if (subjectFilter !== "all") query.set("subject", subjectFilter);
  if (search) query.set("search", search);
  if (statusFilter !== "pending") query.set("status", statusFilter);
  if (typeFilter !== "all") query.set("type", typeFilter);
  if (sortBy !== "smart") query.set("sort", sortBy);
  if (pageSize !== DEFAULT_PAGE_SIZE) query.set("pageSize", String(pageSize));

  return query.toString();
}
