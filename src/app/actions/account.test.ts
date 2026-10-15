import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthenticatedUserIdMock, resetFsrsOptimizationForUserMock } =
  vi.hoisted(() => ({
    getAuthenticatedUserIdMock: vi.fn(),
    resetFsrsOptimizationForUserMock: vi.fn(),
  }));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/features/account/mutations", () => ({
  deleteAccountForUser: vi.fn(),
}));

vi.mock("@/features/flashcards/fsrs/settings", () => ({
  optimizeFsrsParametersForUser: vi.fn(),
  resetFsrsOptimizationForUser: resetFsrsOptimizationForUserMock,
  updateFsrsOptimizationPreferences: vi.fn(),
}));

vi.mock("@/features/user/mutations", () => ({
  updateNotificationPreferences: vi.fn(),
  updateUserAccessStatusForUser: vi.fn(),
}));

vi.mock("@/lib/auth/access-control", () => ({
  isAdminUser: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuth: vi.fn(),
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
}));

describe("account actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
    resetFsrsOptimizationForUserMock.mockResolvedValue(undefined);
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
