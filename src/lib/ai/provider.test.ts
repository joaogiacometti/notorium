import { generateText } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAiModel } from "@/lib/ai/provider";

/** Stands in for the OpenRouter HTTP API; records each request body. */
class FakeOpenRouterApi {
  readonly requestBodies: Record<string, unknown>[] = [];

  fetch = async (_url: string, init: RequestInit): Promise<Response> => {
    this.requestBodies.push(JSON.parse(String(init.body)));
    return Response.json({
      id: "gen-1",
      model: "test/model",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Hi." },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  };
}

describe("getAiModel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the configured reasoning effort with every call", async () => {
    const api = new FakeOpenRouterApi();
    vi.stubGlobal("fetch", api.fetch);

    await generateText({
      model: getAiModel({
        model: "test/model",
        apiKey: "sk-or-v1-test",
        reasoningEffort: "none",
      }),
      prompt: "Hi",
    });

    expect(api.requestBodies[0]).toMatchObject({
      model: "test/model",
      reasoning: { effort: "none" },
    });
  });
});
