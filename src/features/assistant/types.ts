import type { UIMessage } from "ai";
import type { AssistantTools } from "@/features/assistant/tools";
import type { FlashcardSource } from "@/features/flashcards/source-contract";

/**
 * Chat message shared by the assistant route and `useChat`: text plus typed
 * creation and draft-edit proposal parts for user-confirmed changes, and
 * library search parts.
 */
export type AssistantUIMessage = UIMessage<
  { source?: FlashcardSource; lessonSummary?: string; studyAnswer?: boolean },
  never,
  AssistantTools
>;

/** A `proposeFlashcards` tool call as stored in an assistant message. */
export type AssistantFlashcardProposalPart = Extract<
  AssistantUIMessage["parts"][number],
  { type: "tool-proposeFlashcards" }
>;

/** A `startGuidedLesson` marker as stored in an assistant message. */
export type AssistantGuidedLessonPart = Extract<
  AssistantUIMessage["parts"][number],
  { type: "tool-startGuidedLesson" | "tool-endGuidedLesson" }
>;

/** A `searchLibrary` tool call as stored in an assistant message. */
export type AssistantLibrarySearchPart = Extract<
  AssistantUIMessage["parts"][number],
  { type: "tool-searchLibrary" }
>;
