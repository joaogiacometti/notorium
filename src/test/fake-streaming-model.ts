import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";

// Derived from the mock so tests need no direct `@ai-sdk/provider` dependency.
type FakeStreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4["doStream"]>
  >["stream"] extends ReadableStream<infer TPart>
    ? TPart
    : never;

/**
 * A provider-free language model whose stream answers `replyText` in two
 * deltas. Records each call in `doStreamCalls` for prompt assertions.
 *
 * @example
 * const model = createFakeStreamingModel("ATP stores energy.");
 * vi.mocked(getAiModelOrThrow).mockReturnValue(model);
 */
export function createFakeStreamingModel(
  replyText: string,
): MockLanguageModelV4 {
  const half = Math.ceil(replyText.length / 2);
  const parts: FakeStreamPart[] = [
    { type: "text-start", id: "text-1" },
    { type: "text-delta", id: "text-1", delta: replyText.slice(0, half) },
    { type: "text-delta", id: "text-1", delta: replyText.slice(half) },
    { type: "text-end", id: "text-1" },
    {
      type: "finish",
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 5, text: 5, reasoning: undefined },
      },
    },
  ];

  return new MockLanguageModelV4({
    doStream: async () => ({ stream: convertArrayToReadableStream(parts) }),
  });
}

/**
 * Join the text deltas of a UI message stream body (server-sent events).
 *
 * @example
 * expect(readStreamedText(await response.text())).toBe("ATP stores energy.");
 */
export function readStreamedText(sseBody: string): string {
  return sseBody
    .split("\n")
    .filter((line) => line.startsWith("data: {"))
    .map((line) => JSON.parse(line.slice("data: ".length)))
    .filter((chunk) => chunk.type === "text-delta")
    .map((chunk) => chunk.delta)
    .join("");
}
