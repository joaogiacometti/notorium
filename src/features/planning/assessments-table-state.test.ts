import { describe, expect, it } from "vitest";
import { getDueDateBounds } from "@/features/assessments/assessment-filters";
import { derivePlanningAssessmentsTableState } from "@/features/planning/assessments-table-state";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

const assessments: AssessmentEntity[] = [
  {
    id: "assessment-1",
    userId: "user-1",
    subjectId: "subject-1",
    title: "Midterm exam",
    description: null,
    type: "exam",
    status: "pending",
    dueDate: "2026-03-20",
    score: null,
    weight: null,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
  },
  {
    id: "assessment-2",
    userId: "user-1",
    subjectId: "subject-2",
    title: "Lab report",
    description: "Optics",
    type: "assignment",
    status: "completed",
    dueDate: "2026-03-18",
    score: "9.5",
    weight: null,
    createdAt: new Date("2026-03-02T00:00:00.000Z"),
    updatedAt: new Date("2026-03-03T00:00:00.000Z"),
  },
  {
    id: "assessment-3",
    userId: "user-1",
    subjectId: "subject-1",
    title: "Final exam",
    description: null,
    type: "exam",
    status: "pending",
    dueDate: "2026-03-25",
    score: null,
    weight: null,
    createdAt: new Date("2026-03-04T00:00:00.000Z"),
    updatedAt: new Date("2026-03-04T00:00:00.000Z"),
  },
];

describe("derivePlanningAssessmentsTableState", () => {
  it("filters and paginates the assessment table state", () => {
    const result = derivePlanningAssessmentsTableState({
      assessments,
      dueDateBounds: getDueDateBounds(new Date("2026-03-15T00:00:00.000Z")),
      dueDateFilter: "all",
      page: 1,
      pageSize: 1,
      searchQuery: "exam",
      sortBy: "smart",
      statusFilter: "pending",
      subjectFilter: "subject-1",
      typeFilter: "exam",
    });

    expect(result.filteredAssessments.map((item) => item.id)).toEqual([
      "assessment-1",
      "assessment-3",
    ]);
    expect(result.totalPages).toBe(2);
    expect(result.paginatedAssessments.map((item) => item.id)).toEqual([
      "assessment-1",
    ]);
  });

  it("clamps the requested page when the filtered results shrink", () => {
    const result = derivePlanningAssessmentsTableState({
      assessments,
      dueDateBounds: getDueDateBounds(new Date("2026-03-15T00:00:00.000Z")),
      dueDateFilter: "all",
      page: 3,
      pageSize: 2,
      searchQuery: "lab",
      sortBy: "smart",
      statusFilter: "all",
      subjectFilter: "all",
      typeFilter: "all",
    });

    expect(result.totalPages).toBe(1);
    expect(result.clampedPage).toBe(1);
    expect(result.paginatedAssessments.map((item) => item.id)).toEqual([
      "assessment-2",
    ]);
  });
});
