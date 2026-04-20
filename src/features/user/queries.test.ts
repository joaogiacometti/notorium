import { beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();
const selectWhereMock = vi.fn(() => ({
  limit: limitMock,
}));
const selectMock = vi.fn(() => ({
  from: () => ({
    where: selectWhereMock,
  }),
}));
const eqMock = vi.fn((column, value) => ({ column, value }));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  user: {
    id: "user_id_column",
    preferredTheme: "user_preferred_theme_column",
    notificationsEnabled: "user_notifications_enabled_column",
    notificationDaysBefore: "user_notification_days_before_column",
  },
}));

describe("getUserPreferredTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the stored theme when it is valid", async () => {
    limitMock.mockResolvedValueOnce([{ preferredTheme: "dark" }]);

    const { getUserPreferredTheme } = await import("@/features/user/queries");
    const result = await getUserPreferredTheme("user-1");

    expect(result).toBe("dark");
  });

  it("falls back to system when the stored theme is invalid", async () => {
    limitMock.mockResolvedValueOnce([{ preferredTheme: "midnight" }]);

    const { getUserPreferredTheme } = await import("@/features/user/queries");
    const result = await getUserPreferredTheme("user-1");

    expect(result).toBe("system");
  });

  it("falls back to system when the user has no stored theme", async () => {
    limitMock.mockResolvedValueOnce([]);

    const { getUserPreferredTheme } = await import("@/features/user/queries");
    const result = await getUserPreferredTheme("user-1");

    expect(result).toBe("system");
  });
});
