import { type ChatTransport, DefaultChatTransport } from "ai";
import type { AssistantUIMessage } from "@/features/assistant/types";
import { LIMITS } from "@/lib/config/limits";

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
  return firstUserIndex === -1 ? recent : recent.slice(firstUserIndex);
}
