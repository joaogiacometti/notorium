import { describe, expect, it } from "vitest";
import {
  buildStudyWeekOccurrences,
  buildStudyWeekTitle,
  isStudyTermWithinLimit,
} from "@/features/study-schedule/utils";

describe("buildStudyWeekOccurrences", () => {
  it("aligns the first occurrence to the weekday on or after the term start", () => {
    // 2026-02-02 is a Monday; weekday 3 = Wednesday.
    const result = buildStudyWeekOccurrences(3, "2026-02-02", "2026-02-20");

    expect(result.map((item) => item.classDate)).toEqual([
      "2026-02-04",
      "2026-02-11",
      "2026-02-18",
    ]);
  });

  it("numbers weeks from 1 and titles them", () => {
    const [first, second] = buildStudyWeekOccurrences(
      3,
      "2026-02-04",
      "2026-02-11",
    );

    expect(first).toMatchObject({
      week: 1,
      title: "Study week 1 content",
    });
    expect(second.week).toBe(2);
  });

  it("makes each task due the day before the next class", () => {
    const [first] = buildStudyWeekOccurrences(3, "2026-02-04", "2026-02-04");

    expect(first.dueDate).toBe("2026-02-10");
  });

  it("returns a single occurrence when start equals the class day", () => {
    expect(
      buildStudyWeekOccurrences(3, "2026-02-04", "2026-02-04"),
    ).toHaveLength(1);
  });

  it("returns nothing when no class day falls inside the range", () => {
    expect(buildStudyWeekOccurrences(3, "2026-02-05", "2026-02-10")).toEqual(
      [],
    );
  });
});

describe("buildStudyWeekTitle", () => {
  it("names the week", () => {
    expect(buildStudyWeekTitle(4)).toBe("Study week 4 content");
  });
});

describe("isStudyTermWithinLimit", () => {
  it("accepts a normal term", () => {
    expect(isStudyTermWithinLimit("2026-02-02", "2026-06-30")).toBe(true);
  });

  it("rejects a range far beyond the week cap", () => {
    expect(isStudyTermWithinLimit("0001-01-01", "9999-12-31")).toBe(false);
  });
});
