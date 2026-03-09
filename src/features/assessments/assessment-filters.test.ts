import { describe, expect, it } from "vitest";
import {
  filterAndSortAssessments,
  getDueDateBounds,
  getSubjectFilterOptions,
} from "@/features/assessments/assessment-filters";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

function makeAssessment(
  overrides: Partial<AssessmentEntity> = {},
): AssessmentEntity {
  return {
    id: "a1",
    title: "Test",
    description: null,
    type: "other",
    status: "pending",
    dueDate: null,
    score: null,
    weight: null,
    subjectId: "s1",
    userId: "u1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

const BOUNDS = {
  todayIso: "2026-03-01",
  next7DaysIso: "2026-03-08",
  next30DaysIso: "2026-03-31",
};

function filter(
  assessments: AssessmentEntity[],
  overrides: Partial<Parameters<typeof filterAndSortAssessments>[0]> = {},
) {
  return filterAndSortAssessments({
    assessments,
    subjectFilter: "all",
    statusFilter: "all",
    typeFilter: "all",
    dueDateFilter: "all",
    sortBy: "smart",
    dueDateBounds: BOUNDS,
    ...overrides,
  });
}

describe("getDueDateBounds", () => {
  it("returns today, +7, and +30 in yyyy-MM-dd format", () => {
    const result = getDueDateBounds(new Date(2026, 2, 1));

    expect(result.todayIso).toBe("2026-03-01");
    expect(result.next7DaysIso).toBe("2026-03-08");
    expect(result.next30DaysIso).toBe("2026-03-31");
  });
});

describe("getSubjectFilterOptions", () => {
  it("returns unique subject IDs from assessments", () => {
    const items = [
      makeAssessment({ subjectId: "s1" }),
      makeAssessment({ subjectId: "s2" }),
      makeAssessment({ subjectId: "s1" }),
    ];

    expect(getSubjectFilterOptions(items)).toEqual(["s1", "s2"]);
  });

  it("filters out subject IDs not in the provided map", () => {
    const items = [
      makeAssessment({ subjectId: "s1" }),
      makeAssessment({ subjectId: "s2" }),
    ];

    expect(getSubjectFilterOptions(items, { s1: "Math" })).toEqual(["s1"]);
  });

  it("returns all IDs when no map is provided", () => {
    const items = [
      makeAssessment({ subjectId: "s1" }),
      makeAssessment({ subjectId: "s3" }),
    ];

    expect(getSubjectFilterOptions(items)).toEqual(["s1", "s3"]);
  });
});

describe("filterAndSortAssessments — status filter", () => {
  const pending = makeAssessment({ id: "p", status: "pending" });
  const completed = makeAssessment({ id: "c", status: "completed" });
  const overdue = makeAssessment({
    id: "o",
    status: "pending",
    dueDate: "2026-02-01",
  });

  it("returns all items for statusFilter 'all'", () => {
    const result = filter([pending, completed, overdue], {
      statusFilter: "all",
    });
    expect(result).toHaveLength(3);
  });

  it("returns only pending items for statusFilter 'pending'", () => {
    const result = filter([pending, completed, overdue], {
      statusFilter: "pending",
    });
    expect(result.every((i) => i.status === "pending")).toBe(true);
  });

  it("returns only completed items for statusFilter 'completed'", () => {
    const result = filter([pending, completed, overdue], {
      statusFilter: "completed",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c");
  });

  it("returns only overdue items for statusFilter 'overdue'", () => {
    const result = filter([pending, completed, overdue], {
      statusFilter: "overdue",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("o");
  });
});

describe("filterAndSortAssessments — type filter", () => {
  const exam = makeAssessment({ id: "e", type: "exam" });
  const homework = makeAssessment({ id: "h", type: "homework" });

  it("returns only items matching typeFilter", () => {
    const result = filter([exam, homework], { typeFilter: "exam" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e");
  });

  it("returns all items for typeFilter 'all'", () => {
    const result = filter([exam, homework], { typeFilter: "all" });
    expect(result).toHaveLength(2);
  });
});

describe("filterAndSortAssessments — subject filter", () => {
  const s1 = makeAssessment({ id: "1", subjectId: "s1" });
  const s2 = makeAssessment({ id: "2", subjectId: "s2" });

  it("returns only items for given subjectId", () => {
    const result = filter([s1, s2], { subjectFilter: "s1" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns all items when subjectFilter is 'all'", () => {
    const result = filter([s1, s2], { subjectFilter: "all" });
    expect(result).toHaveLength(2);
  });
});

describe("filterAndSortAssessments — due date filter", () => {
  const past = makeAssessment({ id: "past", dueDate: "2026-02-15" });
  const today = makeAssessment({ id: "today", dueDate: "2026-03-01" });
  const next7 = makeAssessment({ id: "next7", dueDate: "2026-03-05" });
  const next30 = makeAssessment({ id: "next30", dueDate: "2026-03-20" });
  const beyond = makeAssessment({ id: "beyond", dueDate: "2026-04-15" });
  const noDue = makeAssessment({ id: "none", dueDate: null });
  const all = [past, today, next7, next30, beyond, noDue];

  it("dueDateFilter 'none' returns only items with no due date", () => {
    const result = filter(all, { dueDateFilter: "none" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("none");
  });

  it("dueDateFilter 'past' returns only items with due date before today", () => {
    const result = filter(all, { dueDateFilter: "past" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("past");
  });

  it("dueDateFilter 'today' returns only today's items", () => {
    const result = filter(all, { dueDateFilter: "today" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("today");
  });

  it("dueDateFilter 'next7Days' returns items from today through +7 days", () => {
    const ids = filter(all, { dueDateFilter: "next7Days" }).map((i) => i.id);
    expect(ids).toContain("today");
    expect(ids).toContain("next7");
    expect(ids).not.toContain("past");
    expect(ids).not.toContain("none");
  });

  it("dueDateFilter 'next30Days' returns items from today through +30 days", () => {
    const ids = filter(all, { dueDateFilter: "next30Days" }).map((i) => i.id);
    expect(ids).toContain("today");
    expect(ids).toContain("next7");
    expect(ids).toContain("next30");
    expect(ids).not.toContain("beyond");
    expect(ids).not.toContain("none");
  });
});

describe("filterAndSortAssessments — sort", () => {
  const older = new Date("2026-01-01");
  const newer = new Date("2026-02-01");

  it("sortBy 'updatedAtDesc' sorts newest first", () => {
    const a = makeAssessment({ id: "a", updatedAt: older });
    const b = makeAssessment({ id: "b", updatedAt: newer });
    const result = filter([a, b], { sortBy: "updatedAtDesc" });
    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("a");
  });

  it("sortBy 'dueDateAsc' sorts earliest due first, null last", () => {
    const early = makeAssessment({ id: "early", dueDate: "2026-03-01" });
    const late = makeAssessment({ id: "late", dueDate: "2026-04-01" });
    const none = makeAssessment({ id: "none", dueDate: null });
    const result = filter([late, none, early], { sortBy: "dueDateAsc" });
    expect(result[0].id).toBe("early");
    expect(result[1].id).toBe("late");
    expect(result[2].id).toBe("none");
  });

  it("sortBy 'dueDateDesc' sorts latest due first, null last", () => {
    const early = makeAssessment({ id: "early", dueDate: "2026-03-01" });
    const late = makeAssessment({ id: "late", dueDate: "2026-04-01" });
    const none = makeAssessment({ id: "none", dueDate: null });
    const result = filter([early, none, late], { sortBy: "dueDateDesc" });
    expect(result[0].id).toBe("late");
    expect(result[1].id).toBe("early");
    expect(result[2].id).toBe("none");
  });

  it("sortBy 'scoreDesc' sorts highest score first, null last", () => {
    const low = makeAssessment({ id: "low", score: "50" });
    const high = makeAssessment({ id: "high", score: "90" });
    const none = makeAssessment({ id: "none", score: null });
    const result = filter([low, none, high], { sortBy: "scoreDesc" });
    expect(result[0].id).toBe("high");
    expect(result[1].id).toBe("low");
    expect(result[2].id).toBe("none");
  });

  it("sortBy 'smart' puts pending before completed", () => {
    const a = makeAssessment({
      id: "a",
      status: "completed",
      updatedAt: newer,
    });
    const b = makeAssessment({ id: "b", status: "pending", updatedAt: older });
    const result = filter([a, b], { sortBy: "smart" });
    expect(result[0].id).toBe("b");
  });

  it("sortBy 'smart' sorts pending by due date asc, null last", () => {
    const soon = makeAssessment({
      id: "soon",
      status: "pending",
      dueDate: "2026-03-05",
    });
    const later = makeAssessment({
      id: "later",
      status: "pending",
      dueDate: "2026-04-01",
    });
    const noDue = makeAssessment({
      id: "noDue",
      status: "pending",
      dueDate: null,
    });
    const result = filter([later, noDue, soon], { sortBy: "smart" });
    expect(result[0].id).toBe("soon");
    expect(result[1].id).toBe("later");
    expect(result[2].id).toBe("noDue");
  });

  it("sortBy 'smart' sorts completed by updatedAt desc", () => {
    const a = makeAssessment({
      id: "a",
      status: "completed",
      updatedAt: older,
    });
    const b = makeAssessment({
      id: "b",
      status: "completed",
      updatedAt: newer,
    });
    const result = filter([a, b], { sortBy: "smart" });
    expect(result[0].id).toBe("b");
  });
});
