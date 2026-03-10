import { describe, expect, it } from "vitest";
import { resolvePlanningView } from "@/features/planning/view";

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
