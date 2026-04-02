import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SNAPSHOT = {
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  REDIS_URL: process.env.REDIS_URL,
  USER_AI_SETTINGS_ENCRYPTION_KEY: process.env.USER_AI_SETTINGS_ENCRYPTION_KEY,
  RATE_LIMIT_BACKEND: process.env.RATE_LIMIT_BACKEND,
  SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
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

  if (SNAPSHOT.USER_AI_SETTINGS_ENCRYPTION_KEY === undefined) {
    delete process.env.USER_AI_SETTINGS_ENCRYPTION_KEY;
  } else {
    process.env.USER_AI_SETTINGS_ENCRYPTION_KEY =
      SNAPSHOT.USER_AI_SETTINGS_ENCRYPTION_KEY;
  }

  if (SNAPSHOT.RATE_LIMIT_BACKEND === undefined) {
    delete process.env.RATE_LIMIT_BACKEND;
  } else {
    process.env.RATE_LIMIT_BACKEND = SNAPSHOT.RATE_LIMIT_BACKEND;
  }

  if (SNAPSHOT.SKIP_ENV_VALIDATION === undefined) {
    delete process.env.SKIP_ENV_VALIDATION;
  } else {
    process.env.SKIP_ENV_VALIDATION = SNAPSHOT.SKIP_ENV_VALIDATION;
  }
}

describe("server env", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.REDIS_URL;
    delete process.env.USER_AI_SETTINGS_ENCRYPTION_KEY;
    delete process.env.RATE_LIMIT_BACKEND;
    delete process.env.SKIP_ENV_VALIDATION;
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
});
