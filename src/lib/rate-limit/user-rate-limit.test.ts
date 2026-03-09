import { describe, expect, it } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";

const { getUtcDayKey, getUtcDayResetAt } = await import(
  "@/lib/rate-limit/user-rate-limit"
);

describe("getUtcDayKey", () => {
  it("uses the utc calendar date", () => {
    expect(getUtcDayKey(new Date("2026-03-09T23:30:00-03:00"))).toBe(
      "2026-03-10",
    );
  });
});

describe("getUtcDayResetAt", () => {
  it("returns the next utc midnight", () => {
    expect(
      getUtcDayResetAt(new Date("2026-03-09T14:15:00Z")).toISOString(),
    ).toBe("2026-03-10T00:00:00.000Z");
  });
});
