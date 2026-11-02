import { beforeEach, describe, expect, it, vi } from "vitest";
import { assistantChatRequestSchema } from "@/features/assistant/validation";
import { FakeDailyRateLimiter } from "@/test/fake-daily-rate-limiter";
import {
  createFakeStreamingModel,
  createFakeToolThenTextModel,
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
    apiKey: "sk-or-v1-test",
    reasoningEffort: "none",
  }),
}));
vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: (
    options: Parameters<FakeDailyRateLimiter["consume"]>[0],
  ) => limiter.current?.consume(options),
}));

class FakeSubjectPaths {
  readonly requestedUserIds: string[] = [];
  load = async (userId: string) => {
    this.requestedUserIds.push(userId);
    return ["Unrelated subject"];
  };
}

function lessonMessages(endedByUser: boolean) {
  return [
    {
      id: "start",
      role: "user",
      parts: [{ type: "text", text: "/learn Topic" }],
    },
    {
      id: "lesson",
      role: "assistant",
      parts: [
        {
          type: "tool-startGuidedLesson",
          toolCallId: "lesson",
          state: "output-available",
          input: { topic: "Topic" },
          output: { topic: "Topic", endedByUser },
        },
        { type: "text", text: "A lesson explanation." },
      ],
    },
  ];
}

describe("lesson closing service", () => {
  beforeEach(() => {
    limiter.current = new FakeDailyRateLimiter();
  });

  it("generates a scoped summary in one call without tools or unrelated material", async () => {
    const model = createFakeStreamingModel(
      "The topic was explained. Understanding was not assessed.",
    );
    getAiModelMock.mockReturnValue(model);
    const subjects = new FakeSubjectPaths();
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const parsed = assistantChatRequestSchema.parse({
      messages: [
        {
          id: "old",
          role: "user",
          parts: [{ type: "text", text: "UNRELATED_EARLIER_TOPIC" }],
        },
        ...lessonMessages(true),
        {
          id: "close",
          role: "user",
          metadata: { lessonSummary: "lesson" },
          parts: [
            { type: "text", text: "Summarize the lesson in its language." },
          ],
        },
      ],
    });
    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages: parsed.messages,
      historyTruncated: true,
      context: {
        kind: "pdf",
        title: "UNRELATED_CURRENT_PDF",
        content: "UNRELATED_PASSAGE",
        page: 7,
        scope: "selection",
        partial: false,
      },
      loadSubjectPaths: subjects.load,
    });
    if (!result.success) throw new Error("Expected a streamed reply");
    await result.response.text();
    expect(model.doStreamCalls).toHaveLength(1);
    expect(subjects.requestedUserIds).toEqual([]);
    const call = model.doStreamCalls[0];
    expect(call.tools ?? []).toEqual([]);
    const prompt = JSON.stringify(call.prompt);
    expect(prompt).not.toContain("UNRELATED_");
    expect(prompt).toContain("A lesson explanation.");
    expect(prompt).toContain("Requested closing summary");
    expect(prompt).toContain("History availability");
    expect(call.maxOutputTokens).toBeLessThanOrEqual(900);
  });

  it("rejects an unsolicited exit while processing a choice answer", async () => {
    const model = createFakeToolThenTextModel(
      "endGuidedLesson",
      {},
      "Feedback on the answer.",
    );
    getAiModelMock.mockReturnValue(model);
    const { streamAssistantReplyForUser } = await import(
      "@/features/assistant/service"
    );
    const parsed = assistantChatRequestSchema.parse({
      messages: [
        ...lessonMessages(false),
        {
          id: "attempt",
          role: "user",
          metadata: { studyAnswer: true },
          parts: [{ type: "text", text: "A) $u+v$" }],
        },
      ],
    });
    const result = await streamAssistantReplyForUser({
      userId: "user-1",
      messages: parsed.messages,
      loadSubjectPaths: new FakeSubjectPaths().load,
    });
    if (!result.success) throw new Error("Expected a streamed reply");
    const body = await result.response.text();
    expect(body).not.toContain('"endedByUser":true');
    expect(
      model.doStreamCalls[0].tools?.map((tool) => tool.name),
    ).not.toContain("endGuidedLesson");
    expect(readStreamedText(body)).toBe("Feedback on the answer.");
  });
});
