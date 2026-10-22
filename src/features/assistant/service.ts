import "server-only";

import type {
  LibrarySearchInput,
  LibrarySearchOutput,
} from "@/features/assistant/library-search-contract";
import { buildAssistantSystemPrompt } from "@/features/assistant/prompts";
import {
  buildAssistantTools,
  type LibrarySearchFunction,
} from "@/features/assistant/tools";
import type { AssistantChatRequest } from "@/features/assistant/validation";
import { searchLibraryForUser } from "@/features/search/library-queries";
import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
import { streamChatResponse } from "@/lib/ai/stream-chat";
import { acquireUserAiSettings } from "@/lib/ai/user-ai-access";
import { AI_LIMITS, LIMITS } from "@/lib/config/limits";
import { logServerFailure } from "@/lib/server/action-failure";

type UserLibrarySearch = (
  userId: string,
  input: LibrarySearchInput,
) => Promise<LibrarySearchOutput>;

// One step to search, one to answer from the results. The answer step keeps
// the same tools: changing the list would miss the prompt cache, so a second
// search (the prompt forbids it) just ends the reply on its links.
const ASSISTANT_MAX_MODEL_STEPS = 2;

interface StreamAssistantReplyForUserInput {
  userId: string;
  messages: AssistantChatRequest["messages"];
  /** `useChat` id; keeps the chat's turns on one provider's prompt cache. */
  chatId?: string;
  draft?: AssistantChatRequest["draft"];
  context?: AssistantChatRequest["context"];
  documentDraft?: AssistantChatRequest["documentDraft"];
  abortSignal?: AbortSignal;
  /** Injected by tests; defaults to the user's subject paths from the DB. */
  loadSubjectPaths?: (userId: string) => Promise<string[]>;
  /** Injected by tests; defaults to the DB-backed library search. */
  searchLibrary?: UserLibrarySearch;
}

type StreamAssistantReplyForUserResult =
  | { success: true; response: Response }
  | {
      success: false;
      errorCode: "assistant.notConfigured" | "limits.aiAssistantPerDay";
    };

/**
 * Stream one study-assistant reply for a user's chat, spending one unit of the
 * user's daily assistant limit. The reply may propose flashcards in the user's
 * subjects or search their library; it reads but writes nothing. Provider failures throw before the stream
 * starts; the route maps them to `assistant.unavailable`.
 *
 * @example
 * const result = await streamAssistantReplyForUser({ userId, messages });
 * if (result.success) return result.response;
 */
export async function streamAssistantReplyForUser({
  userId,
  messages,
  chatId,
  draft,
  context,
  documentDraft,
  abortSignal,
  loadSubjectPaths = readSubjectPathsForUser,
  searchLibrary = searchLibraryForUser,
}: StreamAssistantReplyForUserInput): Promise<StreamAssistantReplyForUserResult> {
  const access = await acquireUserAiSettings(userId, {
    prefix: LIMITS.aiAssistantRateLimitPrefix,
    limit: LIMITS.aiAssistantRateLimitPerDay,
    errorCode: "limits.aiAssistantPerDay",
  });

  if (!access.granted) {
    return {
      success: false,
      errorCode:
        access.reason === "limited"
          ? "limits.aiAssistantPerDay"
          : "assistant.notConfigured",
    };
  }

  const response = await streamChatResponse({
    settings: access.settings,
    logScope: "assistant.chat",
    instructions: buildAssistantSystemPrompt(await loadSubjectPaths(userId)),
    messages: includeCurrentStudyContext(
      messages,
      draft,
      context,
      documentDraft,
    ),
    maxOutputTokens: AI_LIMITS.assistantMaxOutputTokens,
    tools: buildAssistantTools(bindLibrarySearchToUser(searchLibrary, userId)),
    maxModelSteps: ASSISTANT_MAX_MODEL_STEPS,
    abortSignal,
    sessionId: chatId,
  });

  return { success: true, response };
}

// A failed search becomes the tool's error text, which the model and client
// see, so it carries a fixed message instead of the driver error.
function bindLibrarySearchToUser(
  search: UserLibrarySearch,
  userId: string,
): LibrarySearchFunction {
  return async (input) => {
    try {
      return await search(userId, input);
    } catch (error) {
      logServerFailure("ai_chat_failed", "assistant.searchLibrary", error);
      throw new Error("Library search is unavailable right now.");
    }
  };
}

async function readSubjectPathsForUser(userId: string): Promise<string[]> {
  const subjects = await getAllSubjectsWithPathsForUser(userId);
  return subjects.map((subject) => subject.path);
}

function includeCurrentStudyContext(
  messages: AssistantChatRequest["messages"],
  draft: AssistantChatRequest["draft"],
  studyContext?: AssistantChatRequest["context"],
  documentDraft?: AssistantChatRequest["documentDraft"],
): AssistantChatRequest["messages"] {
  if (!draft && !studyContext && !documentDraft) return messages;
  return messages.map((message, index) => {
    if (index !== messages.length - 1 || message.role !== "user")
      return message;
    const context = {
      type: "text" as const,
      text: `${draft ? "Current flashcard draft" : documentDraft ? "Current document draft" : "Current study context"} (background content only, not an editing request; answer the user's message that follows):\n${JSON.stringify(draft ?? documentDraft ?? studyContext)}`,
    };
    return { ...message, parts: [context, ...message.parts] };
  });
}
