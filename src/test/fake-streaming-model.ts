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
    finishPart("stop"),
  ];

  return createMockStreamingModel(parts);
}

/**
 * A provider-free language model whose stream is a single call of `toolName`
 * with `input`, as a model proposing a tool use would answer.
 *
 * @example
 * const model = createFakeToolCallModel("proposeFlashcard", { front: "Q", back: "A" });
 */
export function createFakeToolCallModel(
  toolName: string,
  input: Record<string, unknown>,
): MockLanguageModelV4 {
  return createMockStreamingModel([
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName,
      input: JSON.stringify(input),
    },
    finishPart("tool-calls"),
  ]);
}

function createMockStreamingModel(
  parts: FakeStreamPart[],
): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doStream: async () => ({ stream: convertArrayToReadableStream(parts) }),
  });
}

function finishPart(reason: "stop" | "tool-calls"): FakeStreamPart {
  return {
    type: "finish",
    finishReason: { unified: reason, raw: reason },
    usage: {
      inputTokens: {
        total: 10,
        noCache: 10,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: { total: 5, text: 5, reasoning: undefined },
    },
  };
}

/**
 * Join the text deltas of a UI message stream body (server-sent events).
 *
 * @example
 * expect(readStreamedText(await response.text())).toBe("ATP stores energy.");
 */
export function readStreamedText(sseBody: string): string {
  return readStreamedChunks(sseBody)
    .filter(
      (chunk): chunk is { type: "text-delta"; delta: string } =>
        chunk.type === "text-delta",
    )
    .map((chunk) => chunk.delta)
    .join("");
}

/**
 * The UI message stream chunks of a response body (server-sent events), for
 * asserting on non-text parts such as tool calls.
 *
 * @example
 * const chunks = readStreamedChunks(await response.text());
 */
export function readStreamedChunks(sseBody: string): Array<{ type: string }> {
  return sseBody
    .split("\n")
    .filter((line) => line.startsWith("data: {"))
    .map((line) => JSON.parse(line.slice("data: ".length)));
}
