import { beforeEach, describe, expect, it, vi } from "vitest";

const serverEnv = vi.hoisted(() => ({
  current: {} as Record<string, string | undefined>,
}));

vi.mock("@/env", () => ({ getServerEnv: () => serverEnv.current }));

const openRouterEnv = {
  OPENROUTER_API_KEY: "sk-or-v1-test",
  OPENROUTER_MODEL: "google/gemini-3.1-flash-lite",
};

describe("resolveAiSettings", () => {
  beforeEach(() => {
    serverEnv.current = { ...openRouterEnv };
  });

  it("turns assistant thinking off by default", async () => {
    const { resolveAiSettings } = await import("@/lib/ai/config");

    expect(resolveAiSettings()?.assistantReasoningEffort).toBe("none");
  });

  it("uses the configured assistant reasoning effort", async () => {
    serverEnv.current.OPENROUTER_ASSISTANT_REASONING_EFFORT = "low";
    const { resolveAiSettings } = await import("@/lib/ai/config");

    expect(resolveAiSettings()?.assistantReasoningEffort).toBe("low");
  });

  it("returns null when the model is missing", async () => {
    serverEnv.current.OPENROUTER_MODEL = undefined;
    const { resolveAiSettings } = await import("@/lib/ai/config");

    expect(resolveAiSettings()).toBeNull();
  });
});
