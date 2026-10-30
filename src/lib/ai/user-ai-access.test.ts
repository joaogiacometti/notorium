import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDailyRateLimiter } from "@/test/fake-daily-rate-limiter";

const resolveAiSettingsMock = vi.fn();
const limiter = vi.hoisted(() => ({
  current: null as FakeDailyRateLimiter | null,
}));

vi.mock("@/lib/ai/config", () => ({
  resolveAiSettings: resolveAiSettingsMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: (
    options: Parameters<FakeDailyRateLimiter["consume"]>[0],
  ) => limiter.current?.consume(options),
}));

const settings = {
  model: "test/model",
  apiKey: "sk-or-v1-test",
  reasoningEffort: "none" as const,
};

const dailyLimit = { prefix: "ratelimit:test", limit: 1 };

describe("user AI access", () => {
  beforeEach(() => {
    limiter.current = new FakeDailyRateLimiter();
    resolveAiSettingsMock.mockReset().mockReturnValue(settings);
  });

  it("grants the settings and spends one unit of the daily limit", async () => {
    const { acquireUserAiSettings } = await import("@/lib/ai/user-ai-access");

    const access = await acquireUserAiSettings("user-1", {
      ...dailyLimit,
      errorCode: "limits.testPerDay",
    });

    expect(access).toEqual({ granted: true, settings });
    expect(limiter.current?.calls).toEqual([
      { prefix: "ratelimit:test", userId: "user-1", limit: 1 },
    ]);
  });

  it("denies an unconfigured instance without spending quota", async () => {
    resolveAiSettingsMock.mockReturnValue(null);
    const { acquireUserAiSettings } = await import("@/lib/ai/user-ai-access");

    const access = await acquireUserAiSettings("user-1", {
      ...dailyLimit,
      errorCode: "limits.testPerDay",
    });

    expect(access).toEqual({ granted: false, reason: "notConfigured" });
    expect(limiter.current?.calls).toEqual([]);
  });
});
