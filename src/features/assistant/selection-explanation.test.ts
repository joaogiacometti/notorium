import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDailyRateLimiter } from "@/test/fake-daily-rate-limiter";
import {
  createFakeStreamingModel,
  readStreamedText,
} from "@/test/fake-streaming-model";

const getAiModelMock = vi.fn();
const limiter = vi.hoisted(() => ({
  current: null as FakeDailyRateLimiter | null,
}));
vi.mock("@/lib/ai/provider", () => ({ getAiModel: getAiModelMock }));
vi.mock("@/lib/ai/config", () => ({
  resolveAiSettings: () => ({
    model: "test/model",
    apiKey: "test-key",
    reasoningEffort: "none",
  }),
}));
vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: (
    options: Parameters<FakeDailyRateLimiter["consume"]>[0],
  ) => limiter.current?.consume(options),
}));

describe("selection explanations", () => {
  beforeEach(() => {
    limiter.current = new FakeDailyRateLimiter();
  });

  it("explains a term with no tools, sending context only as user material", async () => {
    const model = createFakeStreamingModel("Average revenue per user.");
    getAiModelMock.mockReturnValue(model);
    const { streamSelectionExplanationForUser } = await import(
      "@/features/assistant/selection-explanation"
    );
    const selection = { text: "ARPU", context: "ARPU grew last quarter." };
    const result = await streamSelectionExplanationForUser({
      userId: "user-1",
      selection,
    });
    if (!result.success) throw new Error("Expected explanation");
    expect(readStreamedText(await result.response.text())).toBe(
      "Average revenue per user.",
    );
    expect(limiter.current?.calls[0]).toMatchObject({
      userId: "user-1",
      prefix: "ratelimit:ai:assistant",
    });
    const call = model.doStreamCalls[0];
    expect(call.prompt).toHaveLength(2);
    expect(JSON.stringify(call.prompt[0])).not.toContain(selection.context);
    expect(call.prompt[1]).toMatchObject({
      role: "user",
      content: [{ type: "text", text: JSON.stringify(selection) }],
    });
    expect(call.tools ?? []).toEqual([]);
  });

  it("does not call the provider after the user's daily limit is reached", async () => {
    vi.spyOn(
      limiter.current as FakeDailyRateLimiter,
      "consume",
    ).mockResolvedValue({
      limited: true,
      errorCode: "limits.aiAssistantPerDay",
      remaining: 0,
      resetAt: "2026-01-02T00:00:00.000Z",
    });
    const { streamSelectionExplanationForUser } = await import(
      "@/features/assistant/selection-explanation"
    );
    expect(
      await streamSelectionExplanationForUser({
        userId: "user-1",
        selection: { text: "ARPU", context: "" },
      }),
    ).toEqual({
      success: false,
      errorCode: "limits.aiAssistantPerDay",
    });
    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it("sends a whole multiline passage to the model", async () => {
    const model = createFakeStreamingModel("The components work together.");
    getAiModelMock.mockReturnValue(model);
    const { streamSelectionExplanationForUser } = await import(
      "@/features/assistant/selection-explanation"
    );
    const selection = {
      text: "A passage describes how different parts of a system interact with each other.\nIt explains the implications of changing one of those parts.",
      context: "Nearby paragraph",
    };
    const result = await streamSelectionExplanationForUser({
      userId: "user-1",
      selection,
    });
    if (!result.success) throw new Error("Expected explanation");
    expect(readStreamedText(await result.response.text())).toBe(
      "The components work together.",
    );
    expect(JSON.stringify(model.doStreamCalls[0]?.prompt.at(-1))).toContain(
      selection.text.split("\n")[1],
    );
    expect(JSON.stringify(model.doStreamCalls[0]?.prompt[0])).not.toContain(
      selection.context,
    );
    expect(limiter.current?.calls).toHaveLength(1);
  });
});
