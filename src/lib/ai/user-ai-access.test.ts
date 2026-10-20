import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiConfigurationError } from "@/lib/ai/errors";
import { FakeDailyRateLimiter } from "@/test/fake-daily-rate-limiter";

const resolveRequiredAiSettingsMock = vi.fn();
const limiter = vi.hoisted(() => ({
  current: null as FakeDailyRateLimiter | null,
}));

vi.mock("@/lib/ai/config", () => ({
  resolveRequiredAiSettings: resolveRequiredAiSettingsMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: (
    options: Parameters<FakeDailyRateLimiter["consume"]>[0],
  ) => limiter.current?.consume(options),
}));

const settings = {
  provider: "openrouter" as const,
  model: "test/model",
  apiKey: "sk-or-v1-test",
};

const dailyLimit = { prefix: "ratelimit:test", limit: 1 };

const errorCodes = {
  notConfigured: "test.notConfigured",
  unavailable: "test.unavailable",
  limited: "limits.testPerDay",
} as const;

describe("user AI access", () => {
  beforeEach(() => {
    limiter.current = new FakeDailyRateLimiter();
    resolveRequiredAiSettingsMock.mockReset().mockReturnValue(settings);
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
    resolveRequiredAiSettingsMock.mockImplementation(() => {
      throw new AiConfigurationError();
    });
    const { acquireUserAiSettings } = await import("@/lib/ai/user-ai-access");

    const access = await acquireUserAiSettings("user-1", {
      ...dailyLimit,
      errorCode: "limits.testPerDay",
    });

    expect(access).toEqual({ granted: false, reason: "notConfigured" });
    expect(limiter.current?.calls).toEqual([]);
  });

  it("runs the task and returns its result", async () => {
    const { runUserAiTask } = await import("@/lib/ai/user-ai-access");

    const result = await runUserAiTask({
      userId: "user-1",
      dailyLimit,
      errorCodes,
      run: async (granted) => ({ success: true, model: granted.model }),
    });

    expect(result).toEqual({ success: true, model: "test/model" });
  });

  it("returns the limited code once the daily limit is spent", async () => {
    const { runUserAiTask } = await import("@/lib/ai/user-ai-access");
    const run = vi.fn(async () => ({ success: true }));

    await runUserAiTask({ userId: "user-1", dailyLimit, errorCodes, run });
    const second = await runUserAiTask({
      userId: "user-1",
      dailyLimit,
      errorCodes,
      run,
    });

    expect(second).toEqual({ success: false, errorCode: "limits.testPerDay" });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("maps provider and limiter failures to the unavailable code", async () => {
    const { runUserAiTask } = await import("@/lib/ai/user-ai-access");

    const providerFailure = await runUserAiTask({
      userId: "user-1",
      dailyLimit,
      errorCodes,
      run: async () => {
        throw new Error("provider 500");
      },
    });
    limiter.current?.failWith(new Error("redis down"));
    const limiterFailure = await runUserAiTask({
      userId: "user-2",
      dailyLimit,
      errorCodes,
      run: async () => ({ success: true }),
    });

    expect(providerFailure).toEqual({
      success: false,
      errorCode: "test.unavailable",
    });
    expect(limiterFailure).toEqual({
      success: false,
      errorCode: "test.unavailable",
    });
  });

  it("maps a configuration error thrown by the task to notConfigured", async () => {
    const { runUserAiTask } = await import("@/lib/ai/user-ai-access");

    const result = await runUserAiTask({
      userId: "user-1",
      dailyLimit,
      errorCodes,
      run: async () => {
        throw new AiConfigurationError();
      },
    });

    expect(result).toEqual({ success: false, errorCode: "test.notConfigured" });
  });
});
