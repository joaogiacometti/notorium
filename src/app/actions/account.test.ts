import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthenticatedUserIdMock,
  resetFsrsOptimizationForUserMock,
  updateUserFake,
  requestHeaders,
} = vi.hoisted(() => ({
  getAuthenticatedUserIdMock: vi.fn(),
  resetFsrsOptimizationForUserMock: vi.fn(),
  updateUserFake: vi.fn(),
  requestHeaders: new Headers({ cookie: "session-fixture" }),
}));

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders,
}));

vi.mock("@/features/account/mutations", () => ({
  deleteAccountForUser: vi.fn(),
}));

vi.mock("@/features/flashcards/fsrs/settings-mutations", () => ({
  optimizeFsrsParametersForUser: vi.fn(),
  resetFsrsOptimizationForUser: resetFsrsOptimizationForUserMock,
  updateFsrsOptimizationPreferences: vi.fn(),
}));

vi.mock("@/features/user/mutations", () => ({
  updateUserAccessStatusForUser: vi.fn(),
}));

vi.mock("@/lib/auth/access-control", () => ({
  isAdminUser: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuth: () => ({ api: { updateUser: updateUserFake } }),
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
}));

describe("account actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-1");
    resetFsrsOptimizationForUserMock.mockResolvedValue(undefined);
    updateUserFake.mockResolvedValue({ status: true });
  });

  it.each(["blocked", "pending", "missing", "revoked"])(
    "does not update a name when the approved-session guard rejects a %s session",
    async () => {
      getAuthenticatedUserIdMock.mockImplementationOnce(async () =>
        redirect("/login"),
      );
      const { updateAccount } = await import("@/app/actions/account");

      await expect(updateAccount({ name: "New name" })).rejects.toMatchObject({
        digest: expect.stringContaining("/login"),
      });
      expect(updateUserFake).not.toHaveBeenCalled();
    },
  );

  it("updates the approved user's name using validated input and session headers", async () => {
    const { updateAccount } = await import("@/app/actions/account");

    const result = await updateAccount({ name: "  New name  " });

    expect(result).toEqual({ success: true });
    expect(updateUserFake).toHaveBeenCalledExactlyOnceWith({
      headers: requestHeaders,
      body: { name: "New name" },
    });
  });

  it("rejects invalid names without updating the user", async () => {
    const { updateAccount } = await import("@/app/actions/account");

    const result = await updateAccount({ name: " " });

    expect(result).toMatchObject({
      success: false,
      errorCode: "account.invalidData",
    });
    expect(updateUserFake).not.toHaveBeenCalled();
  });

  it("keeps provider failures out of the account update result", async () => {
    updateUserFake.mockRejectedValueOnce(new Error("private provider detail"));
    const { updateAccount } = await import("@/app/actions/account");

    const result = await updateAccount({ name: "New name" });

    expect(result).toEqual({
      success: false,
      errorCode: "account.updateFailed",
      errorParams: undefined,
      errorMessage: undefined,
    });
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
