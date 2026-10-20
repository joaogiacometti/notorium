import { type ChatTransport, DefaultChatTransport } from "ai";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { LIMITS } from "@/lib/config/limits";
import {
  resolveActionErrorMessage,
  toActionErrorResult,
} from "@/lib/server/server-action-errors";

const ASSISTANT_CHAT_API = "/api/assistant/chat";

/**
 * Transport for the study assistant's `useChat`. The chat is not persisted,
 * so every turn resends the history; only the newest messages are sent so a
 * long chat stays under the route's `assistantMaxMessages` cap, starting at a
 * user message because some providers reject a leading assistant turn. The
 * chat id goes along so the route can keep every turn on one prompt cache.
 *
 * @example
 * const chat = useChat({ transport: createAssistantChatTransport() });
 */
export function createAssistantChatTransport(): ChatTransport<AssistantUIMessage> {
  return new DefaultChatTransport<AssistantUIMessage>({
    api: ASSISTANT_CHAT_API,
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: { chatId: id, messages: keepRecentChat(messages) },
    }),
  });
}

function keepRecentChat(messages: AssistantUIMessage[]): AssistantUIMessage[] {
  const recent = messages.slice(-LIMITS.assistantMaxMessages);
  const firstUserIndex = recent.findIndex((message) => message.role === "user");
  return firstUserIndex === -1 ? recent : recent.slice(firstUserIndex);
}

/**
 * User-facing text for a failed assistant request. The HTTP transport throws
 * the response body as the error message; the route answers an
 * `ActionErrorResult`, which resolves to a message that is safe to show.
 *
 * @example
 * readAssistantErrorMessage(new Error('{"success":false,"errorCode":"limits.aiAssistantPerDay"}'));
 * // "Daily limit reached for the study assistant."
 */
export function readAssistantErrorMessage(error: Error): string {
  return resolveActionErrorMessage(
    toActionErrorResult(parseJsonOrNull(error.message)),
  );
}

// Network failures and aborted streams carry plain text, not a route body.
function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
