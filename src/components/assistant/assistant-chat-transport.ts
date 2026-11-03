import { type ChatTransport, DefaultChatTransport } from "ai";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { readActiveGuidedLesson } from "@/features/assistant/utils";
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
    prepareSendMessagesRequest: ({ id, messages, body }) => ({
      body: {
        ...body,
        chatId: id,
        messages: keepRecentChat(messages),
        ...(messages.length > LIMITS.assistantMaxMessages
          ? { historyTruncated: true }
          : {}),
      },
    }),
  });
}

function keepRecentChat(messages: AssistantUIMessage[]): AssistantUIMessage[] {
  const recent = messages.slice(-LIMITS.assistantMaxMessages);
  const firstUserIndex = recent.findIndex((message) => message.role === "user");
  const tail = firstUserIndex === -1 ? recent : recent.slice(firstUserIndex);
  const markerId =
    messages.at(-1)?.metadata?.lessonSummary ??
    readActiveGuidedLesson(messages)?.toolCallId;
  if (!markerId || messages.length <= LIMITS.assistantMaxMessages) return tail;
  const markerIndex = messages.findIndex((message) =>
    message.parts.some(
      (part) =>
        part.type === "tool-startGuidedLesson" && part.toolCallId === markerId,
    ),
  );
  if (markerIndex < 0 || tail.includes(messages[markerIndex])) return tail;
  const userIndex = messages
    .slice(0, markerIndex)
    .findLastIndex((message) => message.role === "user");
  if (userIndex < 0) return tail;
  // Keep the session anchor and spend the remaining budget on recent turns.
  const room = LIMITS.assistantMaxMessages - 2;
  const boundedTail = messages.slice(-room);
  const userStart = boundedTail.findIndex((message) => message.role === "user");
  return [
    messages[userIndex],
    messages[markerIndex],
    ...boundedTail.slice(userStart < 0 ? 0 : userStart),
  ];
}

/**
 * User-facing text for a failed assistant request. The HTTP transport throws
 * the response body as the error message; the route answers an
 * `ActionErrorResult`, which resolves to a message that is safe to show.
 *
 * @example
 * readAssistantErrorMessage(new Error('{"success":false,"errorCode":"limits.aiAssistantPerDay"}'));
 * // "Daily limit reached for the assistant."
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
