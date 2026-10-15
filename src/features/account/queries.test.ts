import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getFsrsOptimizationSettingsMock,
  getNotificationPreferencesMock,
  isEmailDeliveryEnabledMock,
  areWorkflowsEnabledMock,
} = vi.hoisted(() => ({
  getFsrsOptimizationSettingsMock: vi.fn(),
  getNotificationPreferencesMock: vi.fn(),
  isEmailDeliveryEnabledMock: vi.fn(),
  areWorkflowsEnabledMock: vi.fn(),
}));

vi.mock("@/features/flashcards/fsrs/settings", () => ({
  getFsrsOptimizationSettings: getFsrsOptimizationSettingsMock,
}));

vi.mock("@/features/user/queries", () => ({
  getNotificationPreferences: getNotificationPreferencesMock,
}));

vi.mock("@/lib/email/config", () => ({
  isEmailDeliveryEnabled: isEmailDeliveryEnabledMock,
}));

vi.mock("@/lib/workflows/config", () => ({
  areWorkflowsEnabled: areWorkflowsEnabledMock,
}));

const sessionUser = {
  id: "user-1",
  name: "Ada",
  email: "ada@example.com",
  createdAt: new Date("2024-01-02T00:00:00.000Z"),
};

describe("getAccountSettingsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bundles session, config flags, and preferences for the settings dialog", async () => {
    isEmailDeliveryEnabledMock.mockReturnValue(true);
    areWorkflowsEnabledMock.mockReturnValue(false);
    getNotificationPreferencesMock.mockResolvedValue({
      notificationsEnabled: true,
      notificationDaysBefore: 3,
    });
    getFsrsOptimizationSettingsMock.mockResolvedValue({
      automaticOptimizationEnabled: false,
      lastOptimizedAt: null,
      optimizedReviewCount: 0,
      reviewCount: 12,
    });

    const { getAccountSettingsForUser } = await import(
      "@/features/account/queries"
    );
    const result = await getAccountSettingsForUser(sessionUser);

    expect(result).toEqual({
      name: "Ada",
      email: "ada@example.com",
      createdAt: "2024-01-02T00:00:00.000Z",
      emailEnabled: true,
      workflowsEnabled: false,
      notificationsEnabled: true,
      notificationDaysBefore: 3,
      fsrsOptimization: {
        automaticOptimizationEnabled: false,
        lastOptimizedAt: null,
        optimizedReviewCount: 0,
        reviewCount: 12,
      },
    });
    expect(getNotificationPreferencesMock).toHaveBeenCalledWith("user-1");
  });

  it("skips the notification query when email delivery is disabled", async () => {
    isEmailDeliveryEnabledMock.mockReturnValue(false);
    areWorkflowsEnabledMock.mockReturnValue(true);
    getFsrsOptimizationSettingsMock.mockResolvedValue({
      automaticOptimizationEnabled: true,
      lastOptimizedAt: null,
      optimizedReviewCount: 0,
      reviewCount: 0,
    });

    const { getAccountSettingsForUser } = await import(
      "@/features/account/queries"
    );
    const result = await getAccountSettingsForUser(sessionUser);

    expect(getNotificationPreferencesMock).not.toHaveBeenCalled();
    expect(result.emailEnabled).toBe(false);
    expect(result.notificationsEnabled).toBe(false);
    expect(result.notificationDaysBefore).toBe(1);
  });
});
