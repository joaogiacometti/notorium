import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

function restoreEnv() {
  if (ORIGINAL_DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
  }
}

describe("db init", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    restoreEnv();
  });

  it("does not build database client at import time", async () => {
    await expect(import("@/db/index")).resolves.toBeTruthy();
  });

  it("throws when DATABASE_URL is missing on first db access", async () => {
    const { getDb } = await import("@/db/index");

    expect(() => getDb()).toThrowError("Invalid environment variables:");
  });
});
