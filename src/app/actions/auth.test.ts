import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

const {
  getApprovedUserByEmailMock,
  getUserAccessStatusByEmailMock,
  consumeUserDailyRateLimitMock,
  requestPasswordResetMock,
  resetPasswordMock,
  signInEmailMock,
  signUpEmailMock,
  signOutMock,
  getServerEnvMock,
  checkAuthRateLimitFake,
} = vi.hoisted(() => ({
  getApprovedUserByEmailMock: vi.fn(),
  getUserAccessStatusByEmailMock: vi.fn(),
  consumeUserDailyRateLimitMock: vi.fn(),
  requestPasswordResetMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  signInEmailMock: vi.fn(),
  signUpEmailMock: vi.fn(),
  signOutMock: vi.fn(),
  getServerEnvMock: vi.fn(),
  checkAuthRateLimitFake: vi.fn(),
}));

vi.mock("@/env", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("@/features/auth/mutations", () => ({
  claimInitialAdminAccess: vi.fn(),
}));

vi.mock("@/features/auth/queries", () => ({
  getApprovedUserByEmail: getApprovedUserByEmailMock,
  getUserAccessStatusByEmail: getUserAccessStatusByEmailMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuth: () => ({
    api: {
      requestPasswordReset: requestPasswordResetMock,
      resetPassword: resetPasswordMock,
      signInEmail: signInEmailMock,
      signUpEmail: signUpEmailMock,
      signOut: signOutMock,
    },
  }),
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  checkAuthRateLimit: checkAuthRateLimitFake,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: consumeUserDailyRateLimitMock,
}));

describe("password reset actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerEnvMock.mockReturnValue({
      BETTER_AUTH_URL: "https://notorium.example.com",
    });
    getApprovedUserByEmailMock.mockResolvedValue({
      id: "user-1",
      email: "active@example.com",
    });
    consumeUserDailyRateLimitMock.mockResolvedValue({
      limited: false,
      remaining: 2,
      resetAt: "2026-04-30T00:00:00.000Z",
    });
    requestPasswordResetMock.mockResolvedValue({});
    resetPasswordMock.mockResolvedValue({});
  });

  describe("requestPasswordResetAction", () => {
    it("rejects invalid input", async () => {
      const { requestPasswordResetAction } = await import("@/app/actions/auth");

      const result = await requestPasswordResetAction({
        email: "not-valid",
      });

      expect(result).toMatchObject({
        success: false,
        errorCode: "auth.invalidInput",
      });
      expect(requestPasswordResetMock).not.toHaveBeenCalled();
    });

    it("returns generic success for missing, pending, or blocked users", async () => {
      getApprovedUserByEmailMock.mockResolvedValue(null);
      const { requestPasswordResetAction } = await import("@/app/actions/auth");

      const result = await requestPasswordResetAction({
        email: "unknown@example.com",
      });

      expect(result).toEqual({ success: true });
      expect(consumeUserDailyRateLimitMock).not.toHaveBeenCalled();
      expect(requestPasswordResetMock).not.toHaveBeenCalled();
    });

    it("sends reset email for approved users", async () => {
      const { requestPasswordResetAction } = await import("@/app/actions/auth");

      const result = await requestPasswordResetAction({
        email: "active@example.com",
      });

      expect(result).toEqual({ success: true });
      expect(consumeUserDailyRateLimitMock).toHaveBeenCalledWith({
        prefix: LIMITS.passwordResetRateLimitPrefix,
        userId: "user-1",
        limit: LIMITS.passwordResetRateLimitPerDay,
        errorCode: "auth.rateLimited",
      });
      expect(requestPasswordResetMock).toHaveBeenCalledWith({
        body: {
          email: "active@example.com",
          redirectTo: "https://notorium.example.com/reset-password",
        },
      });
    });

    it.each(["active@example.com", "  Active@Example.COM  "])(
      "blocks reset for %s after the daily email limit",
      async (email) => {
        consumeUserDailyRateLimitMock.mockResolvedValueOnce({
          limited: true,
          errorCode: "auth.rateLimited",
          remaining: 0,
          resetAt: "2026-04-30T00:00:00.000Z",
        });
        const { requestPasswordResetAction } = await import(
          "@/app/actions/auth"
        );

        const result = await requestPasswordResetAction({
          email,
        });

        expect(result).toMatchObject({
          success: false,
          errorCode: "auth.rateLimited",
        });
        expect(requestPasswordResetMock).not.toHaveBeenCalled();
      },
    );
  });

  describe("resetPasswordAction", () => {
    it("rejects invalid input", async () => {
      const { resetPasswordAction } = await import("@/app/actions/auth");

      const result = await resetPasswordAction({
        token: "",
        password: "short",
        confirmPassword: "short",
      });

      expect(result).toMatchObject({
        success: false,
        errorCode: "auth.invalidInput",
      });
      expect(resetPasswordMock).not.toHaveBeenCalled();
    });

    it("maps Better Auth failures to generic client-safe errors", async () => {
      resetPasswordMock.mockRejectedValueOnce(new Error("invalid token"));
      const { resetPasswordAction } = await import("@/app/actions/auth");

      const result = await resetPasswordAction({
        token: "token-1",
        password: "securepass",
        confirmPassword: "securepass",
      });

      expect(result).toMatchObject({
        success: false,
        errorCode: "auth.passwordResetFailed",
      });
    });

    it("resets password with token and new password", async () => {
      const { resetPasswordAction } = await import("@/app/actions/auth");

      const result = await resetPasswordAction({
        token: "token-1",
        password: "securepass",
        confirmPassword: "securepass",
      });

      expect(result).toEqual({ success: true });
      expect(resetPasswordMock).toHaveBeenCalledWith({
        body: {
          token: "token-1",
          newPassword: "securepass",
        },
      });
    });
  });
});

describe("auth email normalization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    checkAuthRateLimitFake.mockResolvedValue({ limited: false });
    consumeUserDailyRateLimitMock.mockResolvedValue({ limited: false });
    getServerEnvMock.mockReturnValue({
      BETTER_AUTH_URL: "https://notorium.example.com",
    });
  });

  it.each(["pending", "blocked"])(
    "rejects mixed-case login for a %s account before creating a session",
    async (status) => {
      getUserAccessStatusByEmailMock.mockImplementation(async (email) =>
        email === "user@example.com" ? status : null,
      );
      const { loginAction } = await import("@/app/actions/auth");

      const result = await loginAction({
        email: "  User@Example.COM  ",
        password: "securepass",
      });

      expect(result).toMatchObject({
        success: false,
        errorCode:
          status === "pending" ? "auth.accessPending" : "auth.accessBlocked",
      });
      expect(signInEmailMock).not.toHaveBeenCalled();
    },
  );

  it("allows approved login using the same email for approval and authentication", async () => {
    getUserAccessStatusByEmailMock.mockImplementation(async (email) =>
      email === "user@example.com" ? "approved" : null,
    );
    const { loginAction } = await import("@/app/actions/auth");

    const result = await loginAction({
      email: "  User@Example.COM  ",
      password: "securepass",
    });

    expect(result).toEqual({ success: true, data: { redirectTo: "/" } });
    expect(getUserAccessStatusByEmailMock).toHaveBeenCalledWith(
      "user@example.com",
    );
    expect(signInEmailMock).toHaveBeenCalledWith({
      body: { email: "user@example.com", password: "securepass" },
    });
  });

  it("sends an approved reset for mixed-case email and consumes quota once", async () => {
    getApprovedUserByEmailMock.mockImplementation(async (email) =>
      email === "user@example.com"
        ? { id: "user-1", email: "user@example.com" }
        : null,
    );
    const { requestPasswordResetAction } = await import("@/app/actions/auth");

    const result = await requestPasswordResetAction({
      email: "  User@Example.COM  ",
    });

    expect(result).toEqual({ success: true });
    expect(consumeUserDailyRateLimitMock).toHaveBeenCalledTimes(1);
    expect(requestPasswordResetMock).toHaveBeenCalledExactlyOnceWith({
      body: {
        email: "user@example.com",
        redirectTo: "https://notorium.example.com/reset-password",
      },
    });
  });
});
