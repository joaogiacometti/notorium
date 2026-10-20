import {
  convertToModelMessages,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
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
  /** Tools without `execute` end the reply; the client answers them. */
  tools?: ToolSet;
  abortSignal?: AbortSignal;
}

/**
 * Stream a chat reply as an AI SDK UI message stream `Response`, the format
 * `useChat` reads. Streaming counterpart of `generateStructuredOutput`. Errors
 * that happen mid-stream are logged without content and reach the client as
 * the SDK's generic error part, never the provider message. `tools` are
 * passed to `streamText` and to the history conversion, so earlier tool calls
 * and their outputs reach the model.
 *
 * @example
 * return streamChatResponse({
 *   settings,
 *   logScope: "assistant.chat",
 *   instructions: buildAssistantSystemPrompt(subjectPaths),
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
  tools,
  abortSignal,
}: StreamChatResponseOptions): Promise<Response> {
  const result = streamText({
    model: getAiModelOrThrow(settings),
    instructions,
    messages: await convertToModelMessages(messages, { tools }),
    maxOutputTokens,
    tools,
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
