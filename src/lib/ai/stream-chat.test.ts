import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeStreamingModel,
  readStreamedText,
} from "@/test/fake-streaming-model";

const getAiModelOrThrowMock = vi.fn();

vi.mock("@/lib/ai/provider", () => ({
  getAiModelOrThrow: getAiModelOrThrowMock,
}));

const settings = {
  provider: "openrouter" as const,
  model: "test/model",
  apiKey: "sk-or-v1-test",
};

describe("streamChatResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams the model reply as a private UI message stream", async () => {
    const model = createFakeStreamingModel("ATP stores energy.");
    getAiModelOrThrowMock.mockReturnValue(model);
    const { streamChatResponse } = await import("@/lib/ai/stream-chat");

    const response = await streamChatResponse({
      settings,
      logScope: "test.chat",
      instructions: "Be a tutor.",
      messages: [
        { id: "m1", role: "user", parts: [{ type: "text", text: "ATP?" }] },
      ],
      maxOutputTokens: 100,
    });
    const body = await response.text();

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(readStreamedText(body)).toBe("ATP stores energy.");
  });

  it("sends the instructions and chat history to the model", async () => {
    const model = createFakeStreamingModel("Yes.");
    getAiModelOrThrowMock.mockReturnValue(model);
    const { streamChatResponse } = await import("@/lib/ai/stream-chat");

    const response = await streamChatResponse({
      settings,
      logScope: "test.chat",
      instructions: "Be a tutor.",
      messages: [
        { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
        {
          id: "m2",
          role: "assistant",
          parts: [{ type: "text", text: "Hello" }],
        },
        { id: "m3", role: "user", parts: [{ type: "text", text: "Quiz me" }] },
      ],
      maxOutputTokens: 100,
    });
    await response.text();

    const call = model.doStreamCalls[0];
    expect(call?.maxOutputTokens).toBe(100);
    expect(call?.prompt.map((message) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
    ]);
  });
});
