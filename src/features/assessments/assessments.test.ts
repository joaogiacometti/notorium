import { describe, expect, it } from "vitest";
import {
  getAssessmentAverage,
  isAssessmentOverdue,
} from "@/features/assessments/assessments";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

function makeAssessment(
  overrides: Partial<AssessmentEntity> = {},
): AssessmentEntity {
  return {
    id: "a1",
    title: "Test Assessment",
    description: null,
    type: "exam",
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

describe("isAssessmentOverdue", () => {
  const todayIso = "2026-03-01";

  it("returns true for pending assessment with past due date", () => {
    const item = makeAssessment({ status: "pending", dueDate: "2026-02-28" });

    expect(isAssessmentOverdue(item, todayIso)).toBe(true);
  });

  it("returns false for pending assessment with future due date", () => {
    const item = makeAssessment({ status: "pending", dueDate: "2026-03-15" });

    expect(isAssessmentOverdue(item, todayIso)).toBe(false);
  });

  it("returns false for pending assessment due today", () => {
    const item = makeAssessment({ status: "pending", dueDate: "2026-03-01" });

    expect(isAssessmentOverdue(item, todayIso)).toBe(false);
  });

  it("returns false for completed assessment with past due date", () => {
    const item = makeAssessment({ status: "completed", dueDate: "2026-02-28" });

    expect(isAssessmentOverdue(item, todayIso)).toBe(false);
  });

  it("returns false for pending assessment with no due date", () => {
    const item = makeAssessment({ status: "pending", dueDate: null });

    expect(isAssessmentOverdue(item, todayIso)).toBe(false);
  });
});

describe("getAssessmentAverage", () => {
  it("returns null for empty array", () => {
    expect(getAssessmentAverage([])).toBeNull();
  });

  it("returns null when no assessments have scores", () => {
    const items = [
      makeAssessment({ status: "completed", score: null }),
      makeAssessment({ status: "pending", score: null }),
    ];

    expect(getAssessmentAverage(items)).toBeNull();
  });

  it("ignores pending assessments", () => {
    const items = [
      makeAssessment({ status: "completed", score: "80" }),
      makeAssessment({ status: "pending", score: "40" }),
    ];

    expect(getAssessmentAverage(items)).toBe(80);
  });

  it("calculates simple average when no weights", () => {
    const items = [
      makeAssessment({ status: "completed", score: "80" }),
      makeAssessment({ status: "completed", score: "60" }),
      makeAssessment({ status: "completed", score: "100" }),
    ];

    expect(getAssessmentAverage(items)).toBe(80);
  });

  it("calculates weighted average when weights exist", () => {
    const items = [
      makeAssessment({ status: "completed", score: "100", weight: "2" }),
      makeAssessment({ status: "completed", score: "70", weight: "1" }),
    ];

    expect(getAssessmentAverage(items)).toBe(90);
  });

  it("skips items with zero weight in weighted calculation", () => {
    const items = [
      makeAssessment({ status: "completed", score: "90", weight: "1" }),
      makeAssessment({ status: "completed", score: "50", weight: "0" }),
    ];

    expect(getAssessmentAverage(items)).toBe(90);
  });

  it("falls through to simple average when all weights are zero", () => {
    const items = [
      makeAssessment({ status: "completed", score: "90", weight: "0" }),
      makeAssessment({ status: "completed", score: "50", weight: "0" }),
    ];

    expect(getAssessmentAverage(items)).toBe(70);
  });
});
