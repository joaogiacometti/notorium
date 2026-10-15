import { describe, expect, it } from "vitest";
import { calendarEventsRangeSchema } from "@/features/planning/validation";

describe("calendarEventsRangeSchema", () => {
  it("accepts an ISO date range", () => {
    const result = calendarEventsRangeSchema.safeParse({
      rangeStart: "2026-09-28",
      rangeEnd: "2026-11-08",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a single-day range", () => {
    const result = calendarEventsRangeSchema.safeParse({
      rangeStart: "2026-10-15",
      rangeEnd: "2026-10-15",
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["2026-13-01", "2026-12-31"],
    ["2026-10-01T00:00:00Z", "2026-10-31"],
    ["", "2026-10-31"],
  ])("rejects malformed range %s..%s", (rangeStart, rangeEnd) => {
    const result = calendarEventsRangeSchema.safeParse({
      rangeStart,
      rangeEnd,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a range that ends before it starts", () => {
    const result = calendarEventsRangeSchema.safeParse({
      rangeStart: "2026-11-01",
      rangeEnd: "2026-10-01",
    });

    expect(result.success).toBe(false);
  });
});
