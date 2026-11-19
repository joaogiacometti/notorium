import { expect, it } from "vitest";
import { calendarDay, formatDateLong } from "@/lib/dates/format";

it("uses the local calendar day on both sides of the DST change", () => {
  expect(
    calendarDay(new Date("2026-03-08T04:30:00Z"), "America/New_York"),
  ).toBe("2026-03-07");
  expect(
    calendarDay(new Date("2026-03-09T04:30:00Z"), "America/New_York"),
  ).toBe("2026-03-09");
});

it("formats the calendar day in the selected zone", () => {
  const timestamp = "2026-01-01T02:30:00Z";
  expect(formatDateLong(timestamp, "UTC")).toBe("January 1, 2026");
  expect(formatDateLong(timestamp, "America/Sao_Paulo")).toBe(
    "December 31, 2025",
  );
});
