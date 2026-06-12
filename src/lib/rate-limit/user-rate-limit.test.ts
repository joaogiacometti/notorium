import { beforeEach, describe, expect, it, vi } from "vitest";

function stubRequiredEnv() {
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/notorium",
  );
  vi.stubEnv("BETTER_AUTH_SECRET", "secretsecretsecretsecret");
  vi.stubEnv("SKIP_ENV_VALIDATION", "1");
}

function stubUpstashEnv() {
  vi.stubEnv("RATE_LIMIT_BACKEND", "upstash");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.com");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
  stubRequiredEnv();
}

function stubRedisEnv() {
  vi.stubEnv("RATE_LIMIT_BACKEND", "redis");
  vi.stubEnv("REDIS_URL", "redis://localhost:6379");
  stubRequiredEnv();
}

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
    stubUpstashEnv();

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
    stubRedisEnv();

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

describe("consumeUserDailyRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("reports remaining budget and sets expiry on first hit (upstash)", async () => {
    stubUpstashEnv();

    const incrMock = vi.fn().mockResolvedValue(1);
    const expireatMock = vi.fn().mockResolvedValue(1);
    class MockUpstashRedis {
      incr = incrMock;
      expireat = expireatMock;
    }

    vi.doMock("@upstash/redis", () => ({ Redis: MockUpstashRedis }));

    const { consumeUserDailyRateLimit } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    const result = await consumeUserDailyRateLimit({
      prefix: "ai",
      userId: "User-123",
      limit: 5,
      errorCode: "ai_daily_limit",
      now: new Date("2026-03-09T14:15:00Z"),
    });

    expect(result).toEqual({
      limited: false,
      remaining: 4,
      resetAt: "2026-03-10T00:00:00.000Z",
    });
    expect(incrMock).toHaveBeenCalledWith("ai:2026-03-09:user-123");
    // First hit must register a TTL so the counter resets at midnight.
    expect(expireatMock).toHaveBeenCalledTimes(1);
    expect(expireatMock).toHaveBeenCalledWith(
      "ai:2026-03-09:user-123",
      Math.floor(Date.UTC(2026, 2, 10) / 1000),
    );
  });

  it("does not reset expiry on subsequent hits within the budget (upstash)", async () => {
    stubUpstashEnv();

    const incrMock = vi.fn().mockResolvedValue(3);
    const expireatMock = vi.fn();
    class MockUpstashRedis {
      incr = incrMock;
      expireat = expireatMock;
    }

    vi.doMock("@upstash/redis", () => ({ Redis: MockUpstashRedis }));

    const { consumeUserDailyRateLimit } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    const result = await consumeUserDailyRateLimit({
      prefix: "ai",
      userId: "user-1",
      limit: 5,
      errorCode: "ai_daily_limit",
      now: new Date("2026-03-09T14:15:00Z"),
    });

    expect(result.limited).toBe(false);
    expect(expireatMock).not.toHaveBeenCalled();
  });

  it("returns a limited result once the budget is exceeded (upstash)", async () => {
    stubUpstashEnv();

    const incrMock = vi.fn().mockResolvedValue(6);
    class MockUpstashRedis {
      incr = incrMock;
      expireat = vi.fn();
    }

    vi.doMock("@upstash/redis", () => ({ Redis: MockUpstashRedis }));

    const { consumeUserDailyRateLimit } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    const result = await consumeUserDailyRateLimit({
      prefix: "ai",
      userId: "user-1",
      limit: 5,
      errorCode: "ai_daily_limit",
      now: new Date("2026-03-09T14:15:00Z"),
    });

    expect(result).toEqual({
      limited: true,
      errorCode: "ai_daily_limit",
      remaining: 0,
      resetAt: "2026-03-10T00:00:00.000Z",
    });
  });

  it("reports remaining budget and sets expiry on first hit (redis)", async () => {
    stubRedisEnv();

    const incrMock = vi.fn().mockResolvedValue(1);
    const expireAtMock = vi.fn().mockResolvedValue(1);
    const createClientMock = vi.fn(() => ({
      connect: vi.fn().mockResolvedValue({}),
      incr: incrMock,
      expireAt: expireAtMock,
    }));

    vi.doMock("redis", () => ({ createClient: createClientMock }));

    const { consumeUserDailyRateLimit } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    const result = await consumeUserDailyRateLimit({
      prefix: "ai",
      userId: "user-1",
      limit: 5,
      errorCode: "ai_daily_limit",
      now: new Date("2026-03-09T14:15:00Z"),
    });

    expect(result).toEqual({
      limited: false,
      remaining: 4,
      resetAt: "2026-03-10T00:00:00.000Z",
    });
    expect(incrMock).toHaveBeenCalledWith("ai:2026-03-09:user-1");
    expect(expireAtMock).toHaveBeenCalledTimes(1);
    expect(expireAtMock).toHaveBeenCalledWith(
      "ai:2026-03-09:user-1",
      Math.floor(Date.UTC(2026, 2, 10) / 1000),
    );
  });

  it("does not reset expiry on subsequent hits within the budget (redis)", async () => {
    stubRedisEnv();

    const incrMock = vi.fn().mockResolvedValue(3);
    const expireAtMock = vi.fn();
    const createClientMock = vi.fn(() => ({
      connect: vi.fn().mockResolvedValue({}),
      incr: incrMock,
      expireAt: expireAtMock,
    }));

    vi.doMock("redis", () => ({ createClient: createClientMock }));

    const { consumeUserDailyRateLimit } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    const result = await consumeUserDailyRateLimit({
      prefix: "ai",
      userId: "user-1",
      limit: 5,
      errorCode: "ai_daily_limit",
      now: new Date("2026-03-09T14:15:00Z"),
    });

    expect(result.limited).toBe(false);
    expect(expireAtMock).not.toHaveBeenCalled();
  });

  it("returns a limited result once the budget is exceeded (redis)", async () => {
    stubRedisEnv();

    const incrMock = vi.fn().mockResolvedValue(6);
    const createClientMock = vi.fn(() => ({
      connect: vi.fn().mockResolvedValue({}),
      incr: incrMock,
      expireAt: vi.fn(),
    }));

    vi.doMock("redis", () => ({ createClient: createClientMock }));

    const { consumeUserDailyRateLimit } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    const result = await consumeUserDailyRateLimit({
      prefix: "ai",
      userId: "user-1",
      limit: 5,
      errorCode: "ai_daily_limit",
      now: new Date("2026-03-09T14:15:00Z"),
    });

    expect(result).toEqual({
      limited: true,
      errorCode: "ai_daily_limit",
      remaining: 0,
      resetAt: "2026-03-10T00:00:00.000Z",
    });
  });

  it("throws when the upstash backend is selected but unconfigured", async () => {
    stubRequiredEnv();
    vi.stubEnv("RATE_LIMIT_BACKEND", "memory");

    const { consumeUserDailyRateLimit } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    await expect(
      consumeUserDailyRateLimit({
        prefix: "ai",
        userId: "user-1",
        limit: 5,
        errorCode: "ai_daily_limit",
      }),
    ).rejects.toThrow("Upstash Redis is not configured");
  });
});

describe("releaseUserExpiringLock", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("deletes the normalized lock key through upstash", async () => {
    stubUpstashEnv();

    const delMock = vi.fn().mockResolvedValue(1);
    class MockUpstashRedis {
      del = delMock;
    }

    vi.doMock("@upstash/redis", () => ({ Redis: MockUpstashRedis }));

    const { releaseUserExpiringLock } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    await releaseUserExpiringLock({ prefix: "fsrs", userId: "User-123" });

    expect(delMock).toHaveBeenCalledWith("fsrs:user-123");
  });

  it("deletes the normalized lock key through redis", async () => {
    stubRedisEnv();

    const delMock = vi.fn().mockResolvedValue(1);
    const redisConnectMock = vi.fn().mockResolvedValue({});
    const createClientMock = vi.fn(() => ({
      connect: redisConnectMock,
      del: delMock,
    }));

    vi.doMock("redis", () => ({ createClient: createClientMock }));

    const { releaseUserExpiringLock } = await import(
      "@/lib/rate-limit/user-rate-limit"
    );

    await releaseUserExpiringLock({ prefix: "fsrs", userId: "User-123" });

    expect(redisConnectMock).toHaveBeenCalledTimes(1);
    expect(delMock).toHaveBeenCalledWith("fsrs:user-123");
  });
});
