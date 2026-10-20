import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiConfigurationError } from "@/lib/ai/errors";
import { FakeDailyRateLimiter } from "@/test/fake-daily-rate-limiter";
import {
  createFakeStreamingModel,
  readStreamedText,
} from "@/test/fake-streaming-model";

/** Subject store standing in for the DB; records whose subjects were read. */
class FakeSubjectPathStore {
  readonly requestedUserIds: string[] = [];

  constructor(private readonly paths: string[]) {}

  load = async (userId: string): Promise<string[]> => {
    this.requestedUserIds.push(userId);
    return this.paths;
  };
}

const resolveRequiredAiSettingsMock = vi.fn();
const getAiModelOrThrowMock = vi.fn();
const limiter = vi.hoisted(() => ({
  current: null as FakeDailyRateLimiter | null,
}));

vi.mock("@/lib/ai/config", () => ({
  resolveRequiredAiSettings: resolveRequiredAiSettingsMock,
}));

vi.mock("@/lib/ai/provider", () => ({
  getAiModelOrThrow: getAiModelOrThrowMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: (
    options: Parameters<FakeDailyRateLimiter["consume"]>[0],
  ) => limiter.current?.consume(options),
}));

const messages = [
  {
    id: "m1",
    role: "user" as const,
    parts: [{ type: "text" as const, text: "What is ATP?" }],
  },
];

describe("streamAssistantReplyForUser", () => {
  beforeEach(() => {
    limiter.current = new FakeDailyRateLimiter();
    resolveRequiredAiSettingsMock.mockReset().mockReturnValue({
      provider: "openrouter",
      model: "test/model",
      apiKey: "sk-or-v1-test",
    });
  });

  it("streams the reply under the assistant daily limit", async () => {
    getAiModelOrThrowMock.mockReturnValue(
      createFakeStreamingModel("ATP stores energy."),
    );
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      loadSubjectPaths: new FakeSubjectPathStore([]).load,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(readStreamedText(await result.response.text())).toBe(
      "ATP stores energy.",
    );
    expect(limiter.current?.calls[0]?.prefix).toBe("ratelimit:ai:assistant");
  });

  it("returns notConfigured when AI is not set up", async () => {
    resolveRequiredAiSettingsMock.mockImplementation(() => {
      throw new AiConfigurationError();
    });
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
    });

    expect(result).toEqual({
      success: false,
      errorCode: "assistant.notConfigured",
    });
  });

  it("returns the daily limit error without calling the model", async () => {
    vi.spyOn(
      limiter.current as FakeDailyRateLimiter,
      "consume",
    ).mockResolvedValue({
      limited: true,
      errorCode: "limits.aiAssistantPerDay",
      remaining: 0,
      resetAt: "2026-01-02T00:00:00.000Z",
    });
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.aiAssistantPerDay",
    });
    expect(getAiModelOrThrowMock).not.toHaveBeenCalled();
  });

  it("offers the flashcard tool and the user's subject paths", async () => {
    const model = createFakeStreamingModel("Here is a card.");
    getAiModelOrThrowMock.mockReturnValue(model);
    const subjects = new FakeSubjectPathStore(["Biology::Cells"]);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      loadSubjectPaths: subjects.load,
    });
    if (result.success) await result.response.text();

    const call = model.doStreamCalls[0];
    expect(subjects.requestedUserIds).toEqual(["user-1"]);
    expect(call?.tools?.map((tool) => tool.name)).toEqual([
      "proposeFlashcards",
    ]);
    expect(JSON.stringify(call?.prompt[0])).toContain("Biology::Cells");
  });

  it("routes by chat id with the configured reasoning effort", async () => {
    resolveRequiredAiSettingsMock.mockReturnValue({
      provider: "openrouter",
      model: "test/model",
      apiKey: "sk-or-v1-test",
      assistantReasoningEffort: "none",
    });
    const model = createFakeStreamingModel("ATP stores energy.");
    getAiModelOrThrowMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );

    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      chatId: "chat-1",
      loadSubjectPaths: new FakeSubjectPathStore([]).load,
    });
    if (result.success) await result.response.text();

    expect(model.doStreamCalls[0]?.providerOptions?.openrouter).toEqual({
      session_id: "chat-1",
      reasoning: { effort: "none" },
    });
  });
});
