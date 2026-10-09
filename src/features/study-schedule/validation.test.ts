import { describe, expect, it } from "vitest";
import { studyScheduleSchema } from "@/features/study-schedule/validation";

const valid = {
  subjectId: "subject-1",
  weekday: 3,
  termStart: "2026-02-02",
  termEnd: "2026-06-30",
};

describe("studyScheduleSchema", () => {
  it("accepts a normal term", () => {
    expect(studyScheduleSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = studyScheduleSchema.safeParse({
      ...valid,
      termEnd: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a range with no class day", () => {
    const result = studyScheduleSchema.safeParse({
      ...valid,
      termStart: "2026-02-05",
      termEnd: "2026-02-10",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than the max number of class weeks", () => {
    const result = studyScheduleSchema.safeParse({
      ...valid,
      termEnd: "2027-06-30",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a huge range without expanding it into weeks", () => {
    const result = studyScheduleSchema.safeParse({
      ...valid,
      termStart: "0001-01-01",
      termEnd: "9999-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range weekday", () => {
    expect(
      studyScheduleSchema.safeParse({ ...valid, weekday: 7 }).success,
    ).toBe(false);
  });
});
