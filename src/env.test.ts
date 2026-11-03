import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SERVER_ENV_KEYS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "REDIS_URL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "OPENROUTER_REASONING_EFFORT",
  "NOTORIUM_EMAIL_FIXTURE_MODE",
  "NOTORIUM_EMAIL_FIXTURE_INBOX_PATH",
  "NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR",
  "VERCEL",
  "RATE_LIMIT_BACKEND",
  "BLOB_READ_WRITE_TOKEN",
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
  process.env.OPENROUTER_API_KEY = "openrouter-key";
  process.env.OPENROUTER_MODEL = "openrouter/model";
  process.env.BLOB_READ_WRITE_TOKEN = "blob-token";
  process.env.RESEND_API_KEY = "resend-key";
  process.env.RESEND_FROM_EMAIL = "Notorium <notifications@example.com>";
  process.env.CRON_SECRET = "12345678901234567890123456789012";
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

  it("accepts a complete configuration", async () => {
    setRequiredServerEnv();

    const { getServerEnv } = await import("@/env");

    expect(getServerEnv().OPENROUTER_REASONING_EFFORT).toBeUndefined();
  });

  it.each([
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "BLOB_READ_WRITE_TOKEN",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "CRON_SECRET",
  ] as const)("requires %s", async (key) => {
    setRequiredServerEnv();
    delete process.env[key];

    const { getServerEnv } = await import("@/env");

    expect(() => getServerEnv()).toThrowError(key);
  });

  it("parses the assistant reasoning effort when set", async () => {
    setRequiredServerEnv();
    process.env.OPENROUTER_REASONING_EFFORT = "none";

    const { getServerEnv } = await import("@/env");

    expect(getServerEnv().OPENROUTER_REASONING_EFFORT).toBe("none");
  });

  it("rejects an unknown assistant reasoning effort", async () => {
    setRequiredServerEnv();
    process.env.OPENROUTER_REASONING_EFFORT = "turbo";

    const { getServerEnv } = await import("@/env");

    expect(() => getServerEnv()).toThrowError("OPENROUTER_REASONING_EFFORT");
  });

  it("parses Playwright email fixture settings when set", async () => {
    setRequiredServerEnv();
    process.env.NOTORIUM_EMAIL_FIXTURE_MODE = "playwright";
    process.env.NOTORIUM_EMAIL_FIXTURE_INBOX_PATH =
      "test-results/email-fixture-inbox.jsonl";

    const { getServerEnv } = await import("@/env");
    const env = getServerEnv();

    expect(env.NOTORIUM_EMAIL_FIXTURE_MODE).toBe("playwright");
    expect(env.NOTORIUM_EMAIL_FIXTURE_INBOX_PATH).toBe(
      "test-results/email-fixture-inbox.jsonl",
    );
  });

  it("allows the media storage fixture outside Vercel", async () => {
    setRequiredServerEnv();
    process.env.NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR = "test-results/media";

    const { getServerEnv } = await import("@/env");

    expect(getServerEnv().NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR).toBe(
      "test-results/media",
    );
  });

  it("rejects the media storage fixture on a Vercel deployment", async () => {
    setRequiredServerEnv();
    process.env.NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR = "test-results/media";
    process.env.VERCEL = "1";

    const { getServerEnv } = await import("@/env");

    expect(() => getServerEnv()).toThrowError(
      "NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR",
    );
  });
});
