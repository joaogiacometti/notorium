import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;
const ORIGINAL_SKIP_ENV_VALIDATION = process.env.SKIP_ENV_VALIDATION;

function restoreEnv() {
  if (ORIGINAL_DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
  }

  if (ORIGINAL_SKIP_ENV_VALIDATION === undefined) {
    delete process.env.SKIP_ENV_VALIDATION;
  } else {
    process.env.SKIP_ENV_VALIDATION = ORIGINAL_SKIP_ENV_VALIDATION;
  }
}

describe("auth init", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.DATABASE_URL;
    delete process.env.SKIP_ENV_VALIDATION;
  });

  afterEach(() => {
    restoreEnv();
  });

  it("does not initialize auth database adapter at import time", async () => {
    await expect(import("@/lib/auth/auth")).resolves.toBeTruthy();
  });

  it("caches the auth instance after first initialization", async () => {
    const betterAuthMock = vi.fn(() => ({ api: {} }));
    const drizzleAdapterMock = vi.fn(() => "adapter");
    const getDbMock = vi.fn(() => ({ db: true }));

    vi.doMock("better-auth", () => ({
      betterAuth: betterAuthMock,
    }));
    vi.doMock("better-auth/adapters/drizzle", () => ({
      drizzleAdapter: drizzleAdapterMock,
    }));
    vi.doMock("@/db/index", () => ({
      getDb: getDbMock,
    }));

    const { getAuth } = await import("@/lib/auth/auth");
    const authA = getAuth();
    const authB = getAuth();

    expect(authA).toBe(authB);
    expect(getDbMock).toHaveBeenCalledTimes(1);
    expect(drizzleAdapterMock).toHaveBeenCalledTimes(1);
    expect(betterAuthMock).toHaveBeenCalledTimes(1);
  });

  it("creates a fresh auth instance after module reset", async () => {
    const betterAuthMockA = vi.fn(() => ({ api: { source: "a" } }));
    const drizzleAdapterMockA = vi.fn(() => "adapter-a");
    const getDbMockA = vi.fn(() => ({ db: "a" }));

    vi.doMock("better-auth", () => ({
      betterAuth: betterAuthMockA,
    }));
    vi.doMock("better-auth/adapters/drizzle", () => ({
      drizzleAdapter: drizzleAdapterMockA,
    }));
    vi.doMock("@/db/index", () => ({
      getDb: getDbMockA,
    }));

    const firstModule = await import("@/lib/auth/auth");
    const firstAuth = firstModule.getAuth();

    vi.resetModules();

    const betterAuthMockB = vi.fn(() => ({ api: { source: "b" } }));
    const drizzleAdapterMockB = vi.fn(() => "adapter-b");
    const getDbMockB = vi.fn(() => ({ db: "b" }));

    vi.doMock("better-auth", () => ({
      betterAuth: betterAuthMockB,
    }));
    vi.doMock("better-auth/adapters/drizzle", () => ({
      drizzleAdapter: drizzleAdapterMockB,
    }));
    vi.doMock("@/db/index", () => ({
      getDb: getDbMockB,
    }));

    const secondModule = await import("@/lib/auth/auth");
    const secondAuth = secondModule.getAuth();

    expect(firstAuth).not.toBe(secondAuth);
    expect(betterAuthMockA).toHaveBeenCalledTimes(1);
    expect(betterAuthMockB).toHaveBeenCalledTimes(1);
  });

  it("defers db initialization errors until getAuth is called", async () => {
    const betterAuthMock = vi.fn(() => ({ api: {} }));
    const drizzleAdapterMock = vi.fn(() => "adapter");
    const getDbMock = vi.fn(() => {
      throw new Error("db setup failed");
    });

    vi.doMock("better-auth", () => ({
      betterAuth: betterAuthMock,
    }));
    vi.doMock("better-auth/adapters/drizzle", () => ({
      drizzleAdapter: drizzleAdapterMock,
    }));
    vi.doMock("@/db/index", () => ({
      getDb: getDbMock,
    }));

    const authModule = await import("@/lib/auth/auth");
    expect(() => authModule.getAuth()).toThrowError("db setup failed");
    expect(betterAuthMock).not.toHaveBeenCalled();
    expect(drizzleAdapterMock).not.toHaveBeenCalled();
  });
});
