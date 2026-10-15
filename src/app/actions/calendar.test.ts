import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPlanningCalendarDataForUserMock } = vi.hoisted(() => ({
  getPlanningCalendarDataForUserMock: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: async () => "user-1",
}));

vi.mock("@/features/planning/queries", () => ({
  getPlanningCalendarDataForUser: getPlanningCalendarDataForUserMock,
}));

describe("getCalendarEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a malformed range before querying", async () => {
    const { getCalendarEvents } = await import("@/app/actions/calendar");

    await expect(
      getCalendarEvents("not-a-date", "2026-10-31"),
    ).rejects.toThrow();
    expect(getPlanningCalendarDataForUserMock).not.toHaveBeenCalled();
  });

  it("returns the user's calendar data for a valid range", async () => {
    const calendarData = { assessments: [], misses: [] };
    getPlanningCalendarDataForUserMock.mockResolvedValueOnce(calendarData);
    const { getCalendarEvents } = await import("@/app/actions/calendar");

    const result = await getCalendarEvents("2026-09-28", "2026-11-08");

    expect(result).toBe(calendarData);
    expect(getPlanningCalendarDataForUserMock).toHaveBeenCalledWith(
      "user-1",
      "2026-09-28",
      "2026-11-08",
    );
  });
});
