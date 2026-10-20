import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { ResolvedAiSettings } from "@/lib/ai/config";
import { getAiModelOrThrow } from "@/lib/ai/provider";
import { logServerFailure } from "@/lib/server/action-failure";

interface StreamChatResponseOptions {
  settings: ResolvedAiSettings;
  /** `<feature>.<chat>` scope written to `ai_chat_failed` logs. */
  logScope: string;
  instructions: string;
  messages: UIMessage[];
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
}

/**
 * Stream a chat reply as an AI SDK UI message stream `Response`, the format
 * `useChat` reads. Streaming counterpart of `generateStructuredOutput`. Errors
 * that happen mid-stream are logged without content and reach the client as
 * the SDK's generic error part, never the provider message. Future tools plug
 * in here as a `tools` option passed to `streamText`.
 *
 * @example
 * return streamChatResponse({
 *   settings,
 *   logScope: "assistant.chat",
 *   instructions: assistantSystemPrompt,
 *   messages,
 *   maxOutputTokens: 1200,
 * });
 */
export async function streamChatResponse({
  settings,
  logScope,
  instructions,
  messages,
  maxOutputTokens,
  abortSignal,
}: StreamChatResponseOptions): Promise<Response> {
  const result = streamText({
    model: getAiModelOrThrow(settings),
    instructions,
    messages: await convertToModelMessages(messages),
    maxOutputTokens,
    abortSignal,
    onError: ({ error }) => logServerFailure("ai_chat_failed", logScope, error),
  });

  // Reasoning parts would be resent with the chat history on every turn;
  // the UI only renders the answer text.
  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    headers: { "Cache-Control": "private, no-store" },
  });
}
