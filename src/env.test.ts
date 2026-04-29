import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SERVER_ENV_KEYS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "REDIS_URL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "NOTORIUM_AI_FIXTURE_MODE",
  "RATE_LIMIT_BACKEND",
  "BLOB_READ_WRITE_TOKEN",
  "SKIP_ENV_VALIDATION",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
] as const;

type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

const SNAPSHOT = Object.fromEntries(
  SERVER_ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<ServerEnvKey, string | undefined>;

function restoreEnv() {
  for (const key of SERVER_ENV_KEYS) {
    const value = SNAPSHOT[key];

    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

function setRequiredServerEnv() {
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/notorium";
  process.env.BETTER_AUTH_SECRET = "12345678901234567890123456789012";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.RATE_LIMIT_BACKEND = "redis";
}

function clearServerEnv() {
  for (const key of SERVER_ENV_KEYS) {
    delete process.env[key];
  }
}

describe("server env", () => {
  beforeEach(() => {
    vi.resetModules();
    clearServerEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("does not validate required env vars at import time", async () => {
    await expect(import("@/env")).resolves.toBeTruthy();
  });

  it("throws when required env vars are missing on first access", async () => {
    const { getServerEnv } = await import("@/env");

    expect(() => getServerEnv()).toThrowError("Invalid environment variables:");
  });

  it("allows missing blob token", async () => {
    setRequiredServerEnv();

    const { getServerEnv } = await import("@/env");
    const env = getServerEnv();

    expect(env.BLOB_READ_WRITE_TOKEN).toBeUndefined();
  });

  it("parses blob token when set", async () => {
    setRequiredServerEnv();
    process.env.BLOB_READ_WRITE_TOKEN = "token-value";

    const { getServerEnv } = await import("@/env");
    const env = getServerEnv();

    expect(env.BLOB_READ_WRITE_TOKEN).toBe("token-value");
  });

  it("allows missing cron and email notification env vars", async () => {
    setRequiredServerEnv();

    const { getServerEnv } = await import("@/env");
    const env = getServerEnv();

    expect(env.CRON_SECRET).toBeUndefined();
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.RESEND_FROM_EMAIL).toBeUndefined();
  });

  it("allows missing OpenRouter env vars", async () => {
    setRequiredServerEnv();

    const { getServerEnv } = await import("@/env");
    const env = getServerEnv();

    expect(env.OPENROUTER_API_KEY).toBeUndefined();
    expect(env.OPENROUTER_MODEL).toBeUndefined();
  });

  it("parses Playwright AI fixture mode when set", async () => {
    setRequiredServerEnv();
    process.env.NOTORIUM_AI_FIXTURE_MODE = "playwright";

    const { getServerEnv } = await import("@/env");
    const env = getServerEnv();

    expect(env.NOTORIUM_AI_FIXTURE_MODE).toBe("playwright");
  });
});
