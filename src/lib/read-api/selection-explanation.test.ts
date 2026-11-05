import type { UIMessageChunk } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { streamChatResponse } from "@/lib/ai/stream-chat";
import { fetchSelectionExplanation } from "@/lib/read-api/selection-explanation";

const selection = { text: "ARPU", context: "Revenue per user increased." };
const explanationChunks: UIMessageChunk[] = [
  { type: "start", messageId: "reply" },
  { type: "text-start", id: "text" },
  { type: "text-delta", id: "text", delta: "Average revenue per user." },
  { type: "text-end", id: "text" },
];

/** Serves the actual AI SDK stream protocol without a network request. */
class FakeExplanationApi {
  readonly requests: Array<{ url: string; init: RequestInit }> = [];
  status = 200;
  finish = true;
  finishReason: "stop" | "length" = "stop";
  errorCode = "limits.aiAssistantPerDay";

  constructor(private readonly chunks: UIMessageChunk[]) {}

  install() {
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      this.requests.push({ url, init });
      if (this.status !== 200) {
        return Response.json(
          { success: false, errorCode: this.errorCode },
          { status: this.status },
        );
      }
      return new Response(
        `${[
          ...this.chunks,
          ...(this.finish
            ? [{ type: "finish", finishReason: this.finishReason }]
            : []),
        ]
          .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
          .join("")}data: [DONE]\n\n`,
        {
          headers: {
            "Content-Type": "text/event-stream",
            "x-vercel-ai-ui-message-stream": "v1",
          },
        },
      );
    });
    return this;
  }
}

describe("fetchSelectionExplanation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only the selection and reads the explanation", async () => {
    const api = new FakeExplanationApi(explanationChunks).install();
    const controller = new AbortController();
    expect(
      await fetchSelectionExplanation(selection, controller.signal),
    ).toEqual({
      text: "Average revenue per user.",
    });
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0]?.url).toBe("/api/assistant/chat");
    expect(api.requests[0]?.init.signal).toBe(controller.signal);
    expect(JSON.parse(String(api.requests[0]?.init.body))).toEqual({
      intent: "explain-selection",
      selection,
    });
  });

  it("reads a passage explanation using the same flow as a term", async () => {
    new FakeExplanationApi(explanationChunks).install();
    expect(
      await fetchSelectionExplanation({
        text: "A passage describes how different parts of a system interact with each other.\nIt explains the implications of changing one of those parts.",
        context: "Nearby paragraph",
      }),
    ).toEqual({ text: "Average revenue per user." });
  });

  it("ignores non-text parts", async () => {
    new FakeExplanationApi([
      ...explanationChunks,
      { type: "source-url", sourceId: "s", url: "https://example.com/arpu" },
    ]).install();
    expect(await fetchSelectionExplanation(selection)).toEqual({
      text: "Average revenue per user.",
    });
  });

  it("rejects an empty explanation", async () => {
    new FakeExplanationApi([{ type: "start", messageId: "empty" }]).install();
    await expect(fetchSelectionExplanation(selection)).rejects.toThrow(
      "assistant.explanationUnavailable",
    );
  });

  it("surfaces stream errors instead of caching partial text", async () => {
    new FakeExplanationApi([
      ...explanationChunks,
      { type: "error", errorText: "Stream failed" },
    ]).install();
    await expect(fetchSelectionExplanation(selection)).rejects.toThrow();
  });

  it.each(["disconnected", "length"])(
    "rejects a truncated explanation (%s)",
    async (reason) => {
      const api = new FakeExplanationApi(explanationChunks).install();
      api.finish = reason !== "disconnected";
      api.finishReason = reason === "length" ? "length" : "stop";
      await expect(fetchSelectionExplanation(selection)).rejects.toThrow(
        "assistant.explanationUnavailable",
      );
    },
  );

  it("reads what the real server stream produces, requesting no tools", async () => {
    const providerRequests: Record<string, unknown>[] = [];
    let response: Response | undefined;
    // The model call is lazy: it runs while the client reads the route's stream.
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (url === "/api/assistant/chat") return response;
      providerRequests.push(JSON.parse(String(init.body)));
      const chunks = [
        {
          id: "gen-1",
          choices: [
            {
              index: 0,
              delta: { content: "Average revenue per user." },
              finish_reason: null,
            },
          ],
        },
        {
          id: "gen-1",
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        },
      ];
      return new Response(
        `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      );
    });
    response = await streamChatResponse({
      settings: {
        model: "test/model",
        apiKey: "test-key",
        reasoningEffort: "none",
      },
      logScope: "test.explanation",
      instructions: "Explain the selected text.",
      messages: [
        {
          id: "selection",
          role: "user",
          parts: [{ type: "text", text: "ARPU" }],
        },
      ],
      maxOutputTokens: 400,
    });
    expect(await fetchSelectionExplanation(selection)).toEqual({
      text: "Average revenue per user.",
    });
    expect(providerRequests).toHaveLength(1);
    expect(providerRequests[0]?.tools ?? []).toEqual([]);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("preserves safe route errors for the retry UI", async () => {
    const api = new FakeExplanationApi([]).install();
    api.status = 429;
    await expect(fetchSelectionExplanation(selection)).rejects.toThrow(
      "limits.aiAssistantPerDay",
    );
  });
});
