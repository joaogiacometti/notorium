import { describe, expect, it } from "vitest";
import { buildAssessmentsParams } from "@/components/planning/planning-assessments-params";

const defaults = {
  pageSize: 25,
  search: "",
  sortBy: "smart",
  statusFilter: "pending",
  subjectFilter: "all",
  typeFilter: "all",
} as const;

describe("buildAssessmentsParams", () => {
  it("emits only the view when all values are default", () => {
    expect(buildAssessmentsParams(defaults)).toBe("view=assessments");
  });

  it("includes non-default subject, search, and type", () => {
    const result = buildAssessmentsParams({
      ...defaults,
      subjectFilter: "s1",
      search: "midterm",
      typeFilter: "exam",
    });
    expect(result).toBe("view=assessments&subject=s1&search=midterm&type=exam");
  });

  it("includes non-default status, sort, and page size", () => {
    const result = buildAssessmentsParams({
      ...defaults,
      statusFilter: "completed",
      sortBy: "dueDateAsc",
      pageSize: 50,
    });
    expect(result).toBe(
      "view=assessments&status=completed&sort=dueDateAsc&pageSize=50",
    );
  });
});
