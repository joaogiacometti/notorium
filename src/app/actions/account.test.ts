import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthenticatedUserIdMock,
  resetFsrsOptimizationForUserMock,
  requireSessionMock,
  getFsrsOptimizationSettingsMock,
  getNotificationPreferencesMock,
  isEmailDeliveryEnabledMock,
  areWorkflowsEnabledMock,
} = vi.hoisted(() => ({
  getAuthenticatedUserIdMock: vi.fn(),
  resetFsrsOptimizationForUserMock: vi.fn(),
  requireSessionMock: vi.fn(),
  getFsrsOptimizationSettingsMock: vi.fn(),
  getNotificationPreferencesMock: vi.fn(),
  isEmailDeliveryEnabledMock: vi.fn(),
  areWorkflowsEnabledMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/features/account/mutations", () => ({
  deleteAccountForUser: vi.fn(),
}));

vi.mock("@/features/flashcards/fsrs/settings", () => ({
  getFsrsOptimizationSettings: getFsrsOptimizationSettingsMock,
  optimizeFsrsParametersForUser: vi.fn(),
  resetFsrsOptimizationForUser: resetFsrsOptimizationForUserMock,
  updateFsrsOptimizationPreferences: vi.fn(),
}));

vi.mock("@/features/user/mutations", () => ({
  updateNotificationPreferences: vi.fn(),
  updateUserAccessStatusForUser: vi.fn(),
}));

vi.mock("@/features/user/queries", () => ({
  getNotificationPreferences: getNotificationPreferencesMock,
}));

vi.mock("@/lib/auth/access-control", () => ({
  isAdminUser: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuth: vi.fn(),
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
  requireSession: requireSessionMock,
}));

vi.mock("@/lib/email/config", () => ({
  isEmailDeliveryEnabled: isEmailDeliveryEnabledMock,
}));

vi.mock("@/lib/workflows/config", () => ({
  areWorkflowsEnabled: areWorkflowsEnabledMock,
}));

describe("account actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
    resetFsrsOptimizationForUserMock.mockResolvedValue(undefined);
  });

  it("bundles session, config flags, and preferences for the settings dialog", async () => {
    requireSessionMock.mockResolvedValue({
      user: {
        name: "Ada",
        email: "ada@example.com",
        createdAt: new Date("2024-01-02T00:00:00.000Z"),
      },
    });
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

    const { getAccountSettings } = await import("@/app/actions/account");
    const result = await getAccountSettings();

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
  });

  it("skips the notification query when email delivery is disabled", async () => {
    requireSessionMock.mockResolvedValue({
      user: {
        name: "Ada",
        email: "ada@example.com",
        createdAt: new Date("2024-01-02T00:00:00.000Z"),
      },
    });
    isEmailDeliveryEnabledMock.mockReturnValue(false);
    areWorkflowsEnabledMock.mockReturnValue(true);
    getFsrsOptimizationSettingsMock.mockResolvedValue({
      automaticOptimizationEnabled: true,
      lastOptimizedAt: null,
      optimizedReviewCount: 0,
      reviewCount: 0,
    });

    const { getAccountSettings } = await import("@/app/actions/account");
    const result = await getAccountSettings();

    expect(getNotificationPreferencesMock).not.toHaveBeenCalled();
    expect(result.emailEnabled).toBe(false);
    expect(result.notificationsEnabled).toBe(false);
    expect(result.notificationDaysBefore).toBe(1);
  });

  it("resets flashcard scheduler optimization for the authenticated user", async () => {
    const { resetFlashcardSchedulerOptimization } = await import(
      "@/app/actions/account"
    );

    const result = await resetFlashcardSchedulerOptimization();

    expect(result).toEqual({ success: true });
    expect(resetFsrsOptimizationForUserMock).toHaveBeenCalledWith("user-1");
  });

  it("returns a user-facing error when flashcard optimization reset fails", async () => {
    resetFsrsOptimizationForUserMock.mockRejectedValueOnce(new Error("failed"));
    const { resetFlashcardSchedulerOptimization } = await import(
      "@/app/actions/account"
    );

    const result = await resetFlashcardSchedulerOptimization();

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.fsrsOptimization.updateFailed",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});
