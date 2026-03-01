import { describe, expect, it } from "vitest";
import {
  getSubjectCountText,
  getTotalSubjectCount,
} from "@/lib/subjects-count";

describe("getTotalSubjectCount", () => {
  it("sums active and archived subject counts", () => {
    expect(getTotalSubjectCount(3, 2)).toBe(5);
  });
});

describe("getSubjectCountText", () => {
  it("returns onboarding text when user has no subjects", () => {
    expect(
      getSubjectCountText({
        activeCount: 0,
        archivedCount: 0,
        maxSubjects: 5,
      }),
    ).toBe("Get started by creating your first subject.");
  });

  it("returns limited count text without archived subjects", () => {
    expect(
      getSubjectCountText({
        activeCount: 2,
        archivedCount: 0,
        maxSubjects: 5,
      }),
    ).toBe("2/5 subjects");
  });

  it("returns limited count text including archived subjects", () => {
    expect(
      getSubjectCountText({
        activeCount: 4,
        archivedCount: 1,
        maxSubjects: 5,
      }),
    ).toBe("5/5 subjects (1 archived)");
  });

  it("handles unlimited plans with singular subject label", () => {
    expect(
      getSubjectCountText({
        activeCount: 1,
        archivedCount: 0,
        maxSubjects: null,
      }),
    ).toBe("1 subject");
  });

  it("handles unlimited plans with plural subject label", () => {
    expect(
      getSubjectCountText({
        activeCount: 1,
        archivedCount: 2,
        maxSubjects: null,
      }),
    ).toBe("3 subjects");
  });
});
