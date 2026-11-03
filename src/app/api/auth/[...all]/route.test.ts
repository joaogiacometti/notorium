import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  findAuthRecordFake,
  findAuthRecordsFake,
  createAuthRecordFake,
  deleteAuthRecordsFake,
  getApprovedUserByEmailFake,
  consumeUserDailyRateLimitFake,
  sendEmailFake,
} = vi.hoisted(() => ({
  findAuthRecordFake: vi.fn(),
  findAuthRecordsFake: vi.fn(),
  createAuthRecordFake: vi.fn(),
  deleteAuthRecordsFake: vi.fn(),
  getApprovedUserByEmailFake: vi.fn(),
  consumeUserDailyRateLimitFake: vi.fn(),
  sendEmailFake: vi.fn(),
}));

// Exercise the real router, auth configuration, and reset action; fake only I/O.
vi.mock("@/db/index", () => ({ getDb: () => ({}) }));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: () => () => {
    const adapter = {
      id: "auth-records-fake",
      findOne: findAuthRecordFake,
      findMany: findAuthRecordsFake,
      create: createAuthRecordFake,
      deleteMany: deleteAuthRecordsFake,
      transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(adapter),
    };
    return adapter;
  },
}));
vi.mock("@/env", () => ({
  getServerEnv: () => ({ BETTER_AUTH_URL: "http://localhost:3000" }),
}));
vi.mock("@/features/auth/queries", () => ({
  getApprovedUserByEmail: getApprovedUserByEmailFake,
  getUserAccessStatusByEmail: vi.fn(),
}));
vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: consumeUserDailyRateLimitFake,
}));
vi.mock("@/lib/email/provider", () => ({ sendEmail: sendEmailFake }));

const appUrl = "http://localhost:3000";
const resetUser = {
  id: "reset-user",
  email: "reset-user@example.invalid",
  name: "Reset user",
  emailVerified: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function resetRequest() {
  return new Request(`${appUrl}/api/auth/request-password-reset`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: appUrl },
    body: JSON.stringify({ email: resetUser.email }),
  });
}

describe("public auth HTTP boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubEnv("BETTER_AUTH_URL", appUrl);
    vi.stubEnv(
      "BETTER_AUTH_SECRET",
      "auth-boundary-test-secret-with-at-least-32-characters",
    );
    findAuthRecordFake.mockResolvedValue(null);
    findAuthRecordsFake.mockResolvedValue([]);
    createAuthRecordFake.mockImplementation(async ({ data }) => ({
      id: "verification-1",
      ...data,
    }));
    deleteAuthRecordsFake.mockResolvedValue(0);
    getApprovedUserByEmailFake.mockResolvedValue(null);
    consumeUserDailyRateLimitFake.mockResolvedValue({ limited: false });
    sendEmailFake.mockResolvedValue({ success: true, id: "email-1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["pending", "blocked"])(
    "cannot send reset email directly for a %s account",
    async (accessStatus) => {
      findAuthRecordFake.mockResolvedValue({ ...resetUser, accessStatus });
      const { POST } = await import("@/app/api/auth/[...all]/route");
      const response = await POST(resetRequest());

      expect(sendEmailFake).not.toHaveBeenCalled();
      expect(createAuthRecordFake).not.toHaveBeenCalled();
      expect(response.status).toBe(404);
    },
  );

  it("cannot bypass the daily reset email cap through HTTP", async () => {
    findAuthRecordFake.mockResolvedValue({
      ...resetUser,
      accessStatus: "approved",
    });
    consumeUserDailyRateLimitFake.mockResolvedValue({
      limited: true,
      errorCode: "auth.rateLimited",
    });
    const { POST } = await import("@/app/api/auth/[...all]/route");
    const response = await POST(resetRequest());

    expect(sendEmailFake).not.toHaveBeenCalled();
    expect(createAuthRecordFake).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
  });

  it.each([
    "/sign-in/email",
    "/sign-up/email",
    "/reset-password",
    "/update-user",
    "/delete-user",
    "/change-password",
    "/change-email",
    "/sign-out",
    "/revoke-sessions",
    "/reset-password/valid-token",
  ])("blocks direct HTTP writes to %s", async (path) => {
    const { POST } = await import("@/app/api/auth/[...all]/route");
    const response = await POST(
      new Request(`${appUrl}/api/auth${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: appUrl },
        body: "{}",
      }),
    );

    expect(response.status).toBe(404);
    expect(findAuthRecordFake).not.toHaveBeenCalled();
    expect(createAuthRecordFake).not.toHaveBeenCalled();
  });

  it.each(["/get-session", "/list-sessions", "/delete-user/callback", "/ok"])(
    "does not expose unrelated GET endpoint %s",
    async (path) => {
      const { GET } = await import("@/app/api/auth/[...all]/route");
      const response = await GET(new Request(`${appUrl}/api/auth${path}`));

      expect(response.status).toBe(404);
      expect(findAuthRecordFake).not.toHaveBeenCalled();
    },
  );

  it("preserves the password-reset email callback", async () => {
    findAuthRecordsFake.mockResolvedValue([
      {
        id: "verification-1",
        identifier: "reset-password:valid-token",
        value: resetUser.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    const { GET } = await import("@/app/api/auth/[...all]/route");
    const response = await GET(
      new Request(
        `${appUrl}/api/auth/reset-password/valid-token?callbackURL=${encodeURIComponent(`${appUrl}/reset-password`)}`,
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `${appUrl}/reset-password?token=valid-token`,
    );
  });

  it("still rejects invalid reset tokens", async () => {
    const { GET } = await import("@/app/api/auth/[...all]/route");
    const response = await GET(
      new Request(
        `${appUrl}/api/auth/reset-password/invalid-token?callbackURL=${encodeURIComponent(`${appUrl}/reset-password`)}`,
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `${appUrl}/reset-password?error=INVALID_TOKEN`,
    );
  });

  it("keeps redirect-origin validation on the allowed callback", async () => {
    const { getAuth } = await import("@/lib/auth/auth");
    // Better Auth disables origin checks in test mode; exercise the production rule.
    (await getAuth().$context).skipOriginCheck = false;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { GET } = await import("@/app/api/auth/[...all]/route");
      const response = await GET(
        new Request(
          `${appUrl}/api/auth/reset-password/valid-token?callbackURL=https://untrusted.example/reset-password`,
        ),
      );

      expect(response.status).toBe(403);
      expect(findAuthRecordsFake).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("blocks new plugin endpoints without expanding a denylist", async () => {
    const { betterAuth } = await import("better-auth");
    const { createAuthEndpoint } = await import("better-auth/api");
    const { getAuth } = await import("@/lib/auth/auth");
    const options = getAuth().options;
    const auth = betterAuth({
      ...options,
      plugins: [
        ...(options.plugins ?? []),
        {
          id: "future-endpoint-fake",
          endpoints: {
            futureEndpoint: createAuthEndpoint(
              "/future-endpoint",
              { method: "GET" },
              async (ctx) => ctx.json({ reachable: true }),
            ),
          },
        },
      ],
    });

    const response = await auth.handler(
      new Request(`${appUrl}/api/auth/future-endpoint`),
    );

    expect(response.status).toBe(404);
  });

  it("keeps the internal session API available", async () => {
    const { getAuth } = await import("@/lib/auth/auth");
    await expect(
      getAuth().api.getSession({ headers: new Headers() }),
    ).resolves.toBeNull();
  });

  it("keeps internal sign-in available with normal credential validation", async () => {
    const { getAuth } = await import("@/lib/auth/auth");

    await expect(
      getAuth().api.signInEmail({
        body: { email: resetUser.email, password: "not-a-real-password" },
      }),
    ).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect(findAuthRecordFake).toHaveBeenCalled();
  });

  it("still sends approved resets through the Server Action, consuming quota once", async () => {
    findAuthRecordFake.mockResolvedValue(resetUser);
    getApprovedUserByEmailFake.mockResolvedValue(resetUser);
    const { requestPasswordResetAction } = await import("@/app/actions/auth");

    await expect(
      requestPasswordResetAction({ email: resetUser.email }),
    ).resolves.toEqual({ success: true });
    expect(consumeUserDailyRateLimitFake).toHaveBeenCalledTimes(1);
    expect(sendEmailFake).toHaveBeenCalledTimes(1);
    expect(sendEmailFake).toHaveBeenCalledWith(
      expect.objectContaining({ to: resetUser.email }),
    );
  });

  it("still enforces the daily cap in the Server Action", async () => {
    getApprovedUserByEmailFake.mockResolvedValue(resetUser);
    consumeUserDailyRateLimitFake.mockResolvedValue({
      limited: true,
      errorCode: "auth.rateLimited",
    });
    const { requestPasswordResetAction } = await import("@/app/actions/auth");

    await expect(
      requestPasswordResetAction({ email: resetUser.email }),
    ).resolves.toMatchObject({ success: false, errorCode: "auth.rateLimited" });
    expect(sendEmailFake).not.toHaveBeenCalled();
  });
});
