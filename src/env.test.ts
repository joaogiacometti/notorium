import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SNAPSHOT = {
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  REDIS_URL: process.env.REDIS_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  RATE_LIMIT_BACKEND: process.env.RATE_LIMIT_BACKEND,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
  CRON_SECRET: process.env.CRON_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
};

function restoreEnv() {
  if (SNAPSHOT.DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = SNAPSHOT.DATABASE_URL;
  }

  if (SNAPSHOT.BETTER_AUTH_SECRET === undefined) {
    delete process.env.BETTER_AUTH_SECRET;
  } else {
    process.env.BETTER_AUTH_SECRET = SNAPSHOT.BETTER_AUTH_SECRET;
  }

  if (SNAPSHOT.REDIS_URL === undefined) {
    delete process.env.REDIS_URL;
  } else {
    process.env.REDIS_URL = SNAPSHOT.REDIS_URL;
  }

  if (SNAPSHOT.OPENROUTER_API_KEY === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = SNAPSHOT.OPENROUTER_API_KEY;
  }

  if (SNAPSHOT.OPENROUTER_MODEL === undefined) {
    delete process.env.OPENROUTER_MODEL;
  } else {
    process.env.OPENROUTER_MODEL = SNAPSHOT.OPENROUTER_MODEL;
  }

  if (SNAPSHOT.RATE_LIMIT_BACKEND === undefined) {
    delete process.env.RATE_LIMIT_BACKEND;
  } else {
    process.env.RATE_LIMIT_BACKEND = SNAPSHOT.RATE_LIMIT_BACKEND;
  }

  if (SNAPSHOT.BLOB_READ_WRITE_TOKEN === undefined) {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  } else {
    process.env.BLOB_READ_WRITE_TOKEN = SNAPSHOT.BLOB_READ_WRITE_TOKEN;
  }

  if (SNAPSHOT.SKIP_ENV_VALIDATION === undefined) {
    delete process.env.SKIP_ENV_VALIDATION;
  } else {
    process.env.SKIP_ENV_VALIDATION = SNAPSHOT.SKIP_ENV_VALIDATION;
  }

  if (SNAPSHOT.CRON_SECRET === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = SNAPSHOT.CRON_SECRET;
  }

  if (SNAPSHOT.RESEND_API_KEY === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = SNAPSHOT.RESEND_API_KEY;
  }

  if (SNAPSHOT.RESEND_FROM_EMAIL === undefined) {
    delete process.env.RESEND_FROM_EMAIL;
  } else {
    process.env.RESEND_FROM_EMAIL = SNAPSHOT.RESEND_FROM_EMAIL;
  }
}

function setRequiredServerEnv() {
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/notorium";
  process.env.BETTER_AUTH_SECRET = "12345678901234567890123456789012";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.RATE_LIMIT_BACKEND = "redis";
}

describe("server env", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.REDIS_URL;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.RATE_LIMIT_BACKEND;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.SKIP_ENV_VALIDATION;
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
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
});
