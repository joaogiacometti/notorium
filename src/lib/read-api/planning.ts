import type { PlanningAssessmentsQueryInput } from "@/features/assessments/validation";
import type { PlanningCalendarData } from "@/features/planning/queries";
import {
  fetchReadApi,
  fetchReadApiResult,
} from "@/lib/read-api/read-api-client";
import type { PlanningAssessmentsPage } from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";

/**
 * Load one page of the planning assessments table.
 *
 * @example
 * const page = await fetchPlanningAssessmentsPage({ pageIndex: 0, pageSize: 25,
 *   statusFilter: "all", typeFilter: "all", sortBy: "dueDateAsc" });
 */
export function fetchPlanningAssessmentsPage(
  query: PlanningAssessmentsQueryInput,
): Promise<PlanningAssessmentsPage | ActionErrorResult> {
  return fetchReadApiResult<PlanningAssessmentsPage>(
    "/api/assessments/planning-page",
    query,
  );
}

/**
 * Load calendar assessments and misses for an inclusive ISO date range.
 *
 * @example
 * const data = await fetchCalendarEvents("2026-09-28", "2026-11-08");
 */
export function fetchCalendarEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<PlanningCalendarData> {
  return fetchReadApi<PlanningCalendarData>("/api/calendar/events", {
    rangeStart,
    rangeEnd,
  });
}
