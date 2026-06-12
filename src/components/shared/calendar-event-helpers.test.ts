import { describe, expect, it } from "vitest";
import {
  formatEventCount,
  getCalendarEventHref,
  getEventStatusLabel,
  getEventSubtitle,
  getEventTone,
} from "@/components/shared/calendar-event-helpers";
import type { CalendarEvent } from "@/lib/dates/calendar";

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "e1",
    sourceId: "src1",
    date: "2024-05-10",
    title: "Midterm",
    subjectName: "Biology",
    subjectId: "subj1",
    kind: "assessment",
    meta: { type: "exam", status: "pending" },
    ...overrides,
  };
}

const todayIso = "2024-05-15";

describe("getEventTone", () => {
  it("is danger for a miss", () => {
    expect(getEventTone(makeEvent({ kind: "miss" }), todayIso)).toBe("danger");
  });

  it("is danger for a past-due pending assessment", () => {
    expect(getEventTone(makeEvent({ date: "2024-05-01" }), todayIso)).toBe(
      "danger",
    );
  });

  it("is success for a completed assessment", () => {
    const event = makeEvent({ meta: { type: "exam", status: "completed" } });
    expect(getEventTone(event, todayIso)).toBe("success");
  });

  it("is warning for an upcoming pending assessment", () => {
    expect(getEventTone(makeEvent({ date: "2024-05-20" }), todayIso)).toBe(
      "warning",
    );
  });
});

describe("getEventStatusLabel", () => {
  it("labels misses, done, overdue, and pending", () => {
    expect(getEventStatusLabel(makeEvent({ kind: "miss" }), todayIso)).toBe(
      "Miss",
    );
    expect(
      getEventStatusLabel(
        makeEvent({ meta: { status: "completed" } }),
        todayIso,
      ),
    ).toBe("Done");
    expect(
      getEventStatusLabel(makeEvent({ date: "2024-05-01" }), todayIso),
    ).toBe("Overdue");
    expect(
      getEventStatusLabel(makeEvent({ date: "2024-05-20" }), todayIso),
    ).toBe("Pending");
  });
});

describe("getCalendarEventHref", () => {
  it("links assessments with planning context", () => {
    expect(getCalendarEventHref(makeEvent())).toBe(
      "/assessments/src1?from=planning-assessments&subjectId=subj1",
    );
  });

  it("links misses to the subject", () => {
    expect(getCalendarEventHref(makeEvent({ kind: "miss" }))).toBe(
      "/subjects/subj1",
    );
  });
});

describe("getEventSubtitle", () => {
  it("appends the assessment type label", () => {
    expect(getEventSubtitle(makeEvent())).toBe("Biology · Exam");
  });

  it("omits the type for misses", () => {
    expect(getEventSubtitle(makeEvent({ kind: "miss" }))).toBe("Biology");
  });
});

describe("formatEventCount", () => {
  it("formats zero, one, and many", () => {
    expect(formatEventCount(0)).toBe("No items");
    expect(formatEventCount(1)).toBe("1 item");
    expect(formatEventCount(3)).toBe("3 items");
  });
});
