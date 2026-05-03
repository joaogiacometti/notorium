import { describe, expect, it } from "vitest";
import { buildPlanningAssessmentsParams } from "@/features/planning/assessment-url";

describe("buildPlanningAssessmentsParams", () => {
  it("keeps default filters out of the URL", () => {
    expect(
      buildPlanningAssessmentsParams("all", "", "all", "all", "smart"),
    ).toBe("view=assessments");
  });

  it("serializes non-default assessment filters", () => {
    expect(
      buildPlanningAssessmentsParams(
        "subject-1",
        "midterm",
        "pending",
        "exam",
        "dueDateAsc",
      ),
    ).toBe(
      "view=assessments&subject=subject-1&search=midterm&status=pending&type=exam&sort=dueDateAsc",
    );
  });
});
