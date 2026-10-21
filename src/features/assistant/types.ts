import type { UIMessage } from "ai";
import type { AssistantTools } from "@/features/assistant/tools";

/**
 * Chat message shared by the assistant route and `useChat`: text plus typed
 * typed creation and draft-edit proposal parts for user-confirmed changes.
 */
export type AssistantUIMessage = UIMessage<never, never, AssistantTools>;

/** A `proposeFlashcards` tool call as stored in an assistant message. */
export type AssistantFlashcardProposalPart = Extract<
  AssistantUIMessage["parts"][number],
  { type: "tool-proposeFlashcards" }
>;
