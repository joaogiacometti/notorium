import { beforeEach, describe, expect, it, vi } from "vitest";
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

const resolveAiSettingsMock = vi.fn();
const getAiModelMock = vi.fn();
const limiter = vi.hoisted(() => ({
  current: null as FakeDailyRateLimiter | null,
}));

vi.mock("@/lib/ai/config", () => ({
  resolveAiSettings: resolveAiSettingsMock,
}));

vi.mock("@/lib/ai/provider", () => ({
  getAiModel: getAiModelMock,
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
    resolveAiSettingsMock.mockReset().mockReturnValue({
      model: "test/model",
      apiKey: "sk-or-v1-test",
      reasoningEffort: "none",
    });
  });

  it("streams the reply under the assistant daily limit", async () => {
    getAiModelMock.mockReturnValue(
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
    resolveAiSettingsMock.mockReturnValue(null);
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
    expect(getAiModelMock).not.toHaveBeenCalled();
  });

  it("offers the flashcard tool and the user's subject paths", async () => {
    const model = createFakeStreamingModel("Here is a card.");
    getAiModelMock.mockReturnValue(model);
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
      "proposeFlashcardEdits",
      "proposeFlashcards",
    ]);
    expect(JSON.stringify(call?.prompt[0])).toContain("Biology::Cells");
  });

  it("places study context before the question without adding it to system instructions", async () => {
    const model = createFakeStreamingModel("A hint.");
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages,
      context: {
        kind: "review",
        mode: "exam",
        front: "Current visible question",
      },
      loadSubjectPaths: new FakeSubjectPathStore([]).load,
    });
    if (result.success) await result.response.text();
    const prompt = model.doStreamCalls[0].prompt;
    expect(JSON.stringify(prompt[0])).not.toContain("Current visible question");
    const latest = JSON.stringify(prompt.at(-1));
    expect(latest.indexOf("Current visible question")).toBeLessThan(
      latest.indexOf("What is ATP?"),
    );
    expect(latest).not.toContain('"back"');
  });

  it("appends draft context after history without changing system instructions", async () => {
    const model = createFakeStreamingModel("Review changes in the editor.");
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    for (const back of ["<p>First draft</p>", "<p>Second draft</p>"]) {
      const result = await streamAssistantReplyForUser({
        userId: "user-1",
        messages,
        draft: { sessionId: "d", revision: 0, front: "<p>Question</p>", back },
        loadSubjectPaths: new FakeSubjectPathStore([]).load,
      });
      if (result.success) await result.response.text();
    }
    const [first, second] = model.doStreamCalls;
    expect(first.prompt[0]).toEqual(second.prompt[0]);
    expect(first.tools).toEqual(second.tools);
    expect(JSON.stringify(first.prompt.at(-1))).toContain("First draft");
    expect(JSON.stringify(second.prompt.at(-1))).toContain("Second draft");
    expect(JSON.stringify(first.prompt.slice(0, -1))).not.toContain(
      "First draft",
    );
  });

  it("keeps the user's question last when providing a draft as background", async () => {
    const model = createFakeStreamingModel(
      "Alpha squared means alpha multiplied by itself.",
    );
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const question = "what is alpha^2?";
    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages: [
        {
          id: "question",
          role: "user",
          parts: [{ type: "text", text: question }],
        },
      ],
      draft: {
        sessionId: "d",
        revision: 0,
        front: "<p>Explain alpha</p>",
        back: "",
      },
      loadSubjectPaths: new FakeSubjectPathStore([]).load,
    });
    if (result.success) await result.response.text();
    const finalTurn = model.doStreamCalls[0].prompt.at(-1);
    expect(finalTurn?.role).toBe("user");
    expect(finalTurn?.content.at(-1)).toEqual({ type: "text", text: question });
    expect(JSON.stringify(finalTurn?.content.slice(0, -1))).toContain(
      "Explain alpha",
    );
  });

  it("routes by chat id", async () => {
    const model = createFakeStreamingModel("ATP stores energy.");
    getAiModelMock.mockReturnValue(model);
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
    });
  });
});
