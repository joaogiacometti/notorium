import { describe, expect, it } from "vitest";
import {
  resolvePlanningSubject,
  resolvePlanningView,
} from "@/features/planning/view";

describe("resolvePlanningView", () => {
  it("returns assessments when view is missing", () => {
    expect(resolvePlanningView(undefined)).toBe("assessments");
  });

  it("returns calendar for the calendar view", () => {
    expect(resolvePlanningView("calendar")).toBe("calendar");
  });

  it("falls back to assessments for invalid values", () => {
    expect(resolvePlanningView("invalid")).toBe("assessments");
  });
});

describe("resolvePlanningSubject", () => {
  const subjectIds = ["s1", "s2"];

  it("returns undefined when the subject is missing", () => {
    expect(resolvePlanningSubject(undefined, subjectIds)).toBeUndefined();
  });

  it("returns the subject when it exists in the available list", () => {
    expect(resolvePlanningSubject("s2", subjectIds)).toBe("s2");
  });

  it("returns undefined for an invalid subject", () => {
    expect(resolvePlanningSubject("invalid", subjectIds)).toBeUndefined();
  });
});
