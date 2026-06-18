import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateWithRelative } from "@/lib/dates/format";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("formatDateWithRelative", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the empty label when there is no date", () => {
    expect(formatDateWithRelative(null, "No due date")).toBe("No due date");
  });

  it("labels the current day as today", () => {
    expect(formatDateWithRelative(now, "No date")).toContain("(today)");
  });

  it("labels the previous day as yesterday", () => {
    const yesterday = new Date(now.getTime() - DAY_MS);
    expect(formatDateWithRelative(yesterday, "No date")).toContain(
      "(yesterday)",
    );
  });

  it("labels the next day as tomorrow", () => {
    const tomorrow = new Date(now.getTime() + DAY_MS);
    expect(formatDateWithRelative(tomorrow, "No date")).toContain("(tomorrow)");
  });

  it("uses a past suffix for earlier dates", () => {
    const past = new Date(now.getTime() - 5 * DAY_MS);
    expect(formatDateWithRelative(past, "No date")).toContain("ago)");
  });

  it("uses a future suffix for later dates", () => {
    const future = new Date(now.getTime() + 5 * DAY_MS);
    expect(formatDateWithRelative(future, "No date")).toContain("(in ");
  });
});
