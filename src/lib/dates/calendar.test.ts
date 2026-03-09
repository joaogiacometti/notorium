import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  buildCalendarEvents,
  type CalendarSourceData,
  filterEventsByDate,
  getMonthGridDates,
  getWeekDates,
} from "@/lib/dates/calendar";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
} from "@/lib/server/api-contracts";

function makeAssessment(
  overrides: Partial<AssessmentEntity & { subjectName: string }> = {},
): AssessmentEntity & { subjectName: string } {
  return {
    id: "a1",
    title: "Midterm",
    description: null,
    type: "exam",
    status: "pending",
    dueDate: "2026-03-15",
    score: null,
    weight: null,
    subjectId: "s1",
    userId: "u1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    subjectName: "Math",
    ...overrides,
  };
}

function makeMiss(
  overrides: Partial<AttendanceMissEntity & { subjectName: string }> = {},
): AttendanceMissEntity & { subjectName: string } {
  return {
    id: "m1",
    missDate: "2026-03-10",
    subjectId: "s1",
    userId: "u1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    subjectName: "Math",
    ...overrides,
  };
}

describe("buildCalendarEvents", () => {
  it("returns empty array for no data", () => {
    const data: CalendarSourceData = { assessments: [], misses: [] };

    expect(buildCalendarEvents(data)).toEqual([]);
  });

  it("creates assessment events with prefixed id and kind", () => {
    const data: CalendarSourceData = {
      assessments: [makeAssessment({ id: "abc" })],
      misses: [],
    };

    const events = buildCalendarEvents(data);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "a-abc",
      date: "2026-03-15",
      title: "Midterm",
      subjectName: "Math",
      subjectId: "s1",
      kind: "assessment",
      meta: { type: "exam", status: "pending" },
    });
  });

  it("skips assessments without dueDate", () => {
    const data: CalendarSourceData = {
      assessments: [makeAssessment({ dueDate: null })],
      misses: [],
    };

    expect(buildCalendarEvents(data)).toEqual([]);
  });

  it("creates miss events with prefixed id and kind", () => {
    const data: CalendarSourceData = {
      assessments: [],
      misses: [makeMiss({ id: "xyz", missDate: "2026-03-10" })],
    };

    const events = buildCalendarEvents(data);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "m-xyz",
      date: "2026-03-10",
      title: "Missed class",
      subjectName: "Math",
      subjectId: "s1",
      kind: "miss",
    });
    expect(events[0].meta).toBeUndefined();
  });

  it("combines assessments and misses in order", () => {
    const data: CalendarSourceData = {
      assessments: [
        makeAssessment({ id: "a1" }),
        makeAssessment({ id: "a2", title: "Final" }),
      ],
      misses: [makeMiss({ id: "m1" }), makeMiss({ id: "m2" })],
    };

    const events = buildCalendarEvents(data);

    expect(events).toHaveLength(4);
    expect(events[0].kind).toBe("assessment");
    expect(events[1].kind).toBe("assessment");
    expect(events[2].kind).toBe("miss");
    expect(events[3].kind).toBe("miss");
  });

  it("preserves different subject names per event", () => {
    const data: CalendarSourceData = {
      assessments: [makeAssessment({ subjectName: "Physics" })],
      misses: [makeMiss({ subjectName: "Chemistry" })],
    };

    const events = buildCalendarEvents(data);

    expect(events[0].subjectName).toBe("Physics");
    expect(events[1].subjectName).toBe("Chemistry");
  });
});

describe("getMonthGridDates", () => {
  it("returns dates starting on Monday and ending on Sunday", () => {
    const anchor = new Date(2026, 2, 15);
    const dates = getMonthGridDates(anchor);

    expect(format(dates[0], "EEEE")).toBe("Monday");
    expect(format(dates[dates.length - 1], "EEEE")).toBe("Sunday");
  });

  it("always returns a multiple of 7 dates", () => {
    const anchor = new Date(2026, 2, 15);
    const dates = getMonthGridDates(anchor);

    expect(dates.length % 7).toBe(0);
  });

  it("includes all days of the anchor month", () => {
    const anchor = new Date(2026, 2, 15);
    const dates = getMonthGridDates(anchor);
    const isoStrings = dates.map((d) => format(d, "yyyy-MM-dd"));

    for (let day = 1; day <= 31; day++) {
      const dayStr = `2026-03-${String(day).padStart(2, "0")}`;
      expect(isoStrings).toContain(dayStr);
    }
  });

  it("includes leading days from previous month", () => {
    const anchor = new Date(2026, 2, 1);
    const dates = getMonthGridDates(anchor);

    expect(format(dates[0], "yyyy-MM-dd")).toBe("2026-02-23");
  });

  it("includes trailing days from next month when month doesn't end on Sunday", () => {
    const anchor = new Date(2026, 2, 1);
    const dates = getMonthGridDates(anchor);
    const last = dates[dates.length - 1];

    expect(format(last, "EEEE")).toBe("Sunday");
    expect(last.getTime()).toBeGreaterThanOrEqual(
      new Date(2026, 2, 31).getTime(),
    );
  });

  it("handles months starting on Monday with no leading days from prev month", () => {
    const anchor = new Date(2026, 5, 1);
    const dates = getMonthGridDates(anchor);

    expect(format(dates[0], "yyyy-MM-dd")).toBe("2026-06-01");
  });
});

describe("getWeekDates", () => {
  it("returns exactly 7 dates", () => {
    const anchor = new Date(2026, 2, 15);

    expect(getWeekDates(anchor)).toHaveLength(7);
  });

  it("starts on Monday", () => {
    const anchor = new Date(2026, 2, 18);
    const dates = getWeekDates(anchor);

    expect(format(dates[0], "EEEE")).toBe("Monday");
  });

  it("ends on Sunday", () => {
    const anchor = new Date(2026, 2, 18);
    const dates = getWeekDates(anchor);

    expect(format(dates[6], "EEEE")).toBe("Sunday");
  });

  it("returns consecutive days", () => {
    const anchor = new Date(2026, 2, 18);
    const dates = getWeekDates(anchor);

    for (let i = 1; i < dates.length; i++) {
      const diff = dates[i].getTime() - dates[i - 1].getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("anchors to the correct week when given a Wednesday", () => {
    const anchor = new Date(2026, 2, 18);
    const dates = getWeekDates(anchor);

    expect(format(dates[0], "yyyy-MM-dd")).toBe("2026-03-16");
    expect(format(dates[6], "yyyy-MM-dd")).toBe("2026-03-22");
  });
});

describe("filterEventsByDate", () => {
  const events = buildCalendarEvents({
    assessments: [
      makeAssessment({ id: "a1", dueDate: "2026-03-10" }),
      makeAssessment({ id: "a2", dueDate: "2026-03-15" }),
    ],
    misses: [
      makeMiss({ id: "m1", missDate: "2026-03-10" }),
      makeMiss({ id: "m2", missDate: "2026-03-20" }),
    ],
  });

  it("returns only events matching the given date", () => {
    const result = filterEventsByDate(events, "2026-03-10");

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(["a-a1", "m-m1"]);
  });

  it("returns empty for a date with no events", () => {
    expect(filterEventsByDate(events, "2026-03-01")).toEqual([]);
  });

  it("returns single event when only one matches", () => {
    const result = filterEventsByDate(events, "2026-03-20");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m-m2");
  });
});
