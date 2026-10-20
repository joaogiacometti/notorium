import type { UIMessage } from "ai";

/**
 * Chat message shared by the assistant route and `useChat`. Text-only today;
 * typed tool parts get added here (`UIMessage<never, never, AssistantTools>`)
 * once the assistant can act on app data.
 */
export type AssistantUIMessage = UIMessage;
