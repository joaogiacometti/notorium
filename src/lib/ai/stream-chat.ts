import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
import type { ResolvedAiSettings } from "@/lib/ai/config";
import { getAiModel } from "@/lib/ai/provider";
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
  /** Available this reply; all definitions remain available for history. */
  activeTools?: string[];
  /**
   * Model calls allowed per reply (default 1). Above 1, results of tools with
   * `execute` go back to the model so it can answer from them; each extra
   * step resends the whole prompt (mostly from the prompt cache).
   */
  maxModelSteps?: number;
  abortSignal?: AbortSignal;
  /**
   * Stable id of the conversation, sent as OpenRouter's `session_id` so every
   * turn routes to the provider that already holds the cached prompt prefix.
   */
  sessionId?: string;
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
 *   instructions: buildAssistantSystemPrompt(),
 *   messages,
 *   maxOutputTokens: 1200,
 *   sessionId: chatId,
 * });
 */
export async function streamChatResponse({
  settings,
  logScope,
  instructions,
  messages,
  maxOutputTokens,
  tools,
  activeTools,
  maxModelSteps = 1,
  abortSignal,
  sessionId,
}: StreamChatResponseOptions): Promise<Response> {
  const result = streamText({
    model: getAiModel(settings),
    instructions,
    messages: await convertToModelMessages(messages, { tools }),
    maxOutputTokens,
    tools,
    activeTools,
    stopWhen: isStepCount(maxModelSteps),
    abortSignal,
    // Spread into the OpenRouter request body as-is, hence the snake_case.
    providerOptions: sessionId
      ? { openrouter: { session_id: sessionId } }
      : undefined,
    onError: ({ error }) => logServerFailure("ai_chat_failed", logScope, error),
  });

  // Reasoning parts would be resent with the chat history on every turn;
  // the UI only renders the answer text.
  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    headers: { "Cache-Control": "private, no-store" },
  });
}
