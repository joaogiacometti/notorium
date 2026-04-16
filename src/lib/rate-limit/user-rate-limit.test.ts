import { beforeEach, describe, expect, it, vi } from "vitest";

describe("getUtcDayKey", () => {
  it("uses the utc calendar date", async () => {
    const { getUtcDayKey } = await import("@/lib/rate-limit/user-rate-limit");
    expect(getUtcDayKey(new Date("2026-03-09T23:30:00-03:00"))).toBe(
      "2026-03-10",
    );
  });
});

describe("getUtcDayResetAt", () => {
  it("returns the next utc midnight", async () => {
    const { getUtcDayResetAt } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );
    expect(
      getUtcDayResetAt(new Date("2026-03-09T14:15:00Z")).toISOString(),
    ).toBe("2026-03-10T00:00:00.000Z");
  });
});

describe("tryAcquireUserExpiringLock", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("initializes and uses upstash client when backend is upstash", async () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "upstash");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:postgres@localhost:5432/notorium",
    );
    vi.stubEnv("BETTER_AUTH_SECRET", "secretsecretsecretsecret");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("SKIP_ENV_VALIDATION", "1");

    const upstashSetMock = vi.fn().mockResolvedValue("OK");
    const upstashCtorMock = vi.fn();
    class MockUpstashRedis {
      set = upstashSetMock;

      constructor(...args: unknown[]) {
        upstashCtorMock(...args);
      }
    }

    vi.doMock("@upstash/redis", () => ({
      Redis: MockUpstashRedis,
    }));

    const { tryAcquireUserExpiringLock } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    await expect(
      tryAcquireUserExpiringLock({
        prefix: "fsrs",
        userId: "User-123",
        ttlSeconds: 30,
      }),
    ).resolves.toBe(true);

    expect(upstashCtorMock).toHaveBeenCalledTimes(1);
    expect(upstashSetMock).toHaveBeenCalledWith("fsrs:user-123", "1", {
      nx: true,
      ex: 30,
    });
  });

  it("uses redis client path when backend is redis", async () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "redis");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:postgres@localhost:5432/notorium",
    );
    vi.stubEnv("BETTER_AUTH_SECRET", "secretsecretsecretsecret");
    vi.stubEnv("SKIP_ENV_VALIDATION", "1");

    const redisSetMock = vi.fn().mockResolvedValue("OK");
    const redisConnectMock = vi.fn().mockResolvedValue({});
    const createClientMock = vi.fn(() => ({
      connect: redisConnectMock,
      set: redisSetMock,
    }));

    vi.doMock("redis", () => ({
      createClient: createClientMock,
    }));

    const { tryAcquireUserExpiringLock } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    await expect(
      tryAcquireUserExpiringLock({
        prefix: "fsrs",
        userId: "User-123",
        ttlSeconds: 45,
      }),
    ).resolves.toBe(true);

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(redisConnectMock).toHaveBeenCalledTimes(1);
    expect(redisSetMock).toHaveBeenCalledWith("fsrs:user-123", "1", {
      NX: true,
      EX: 45,
    });
  });
});
