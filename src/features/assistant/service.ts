import "server-only";

import { readActiveLessonTopic } from "@/features/assistant/guided-lesson-contract";
import { readRequestedLessonSummary } from "@/features/assistant/lesson-summary";
import type {
  LibrarySearchInput,
  LibrarySearchOutput,
} from "@/features/assistant/library-search-contract";
import { buildAssistantSystemPrompt } from "@/features/assistant/prompts";
import { assembleAssistantMessages } from "@/features/assistant/request-context";
import { isStudyAnswerTurn } from "@/features/assistant/study-question-contract";
import {
  buildAssistantTools,
  type LibrarySearchFunction,
  selectAssistantActiveTools,
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

// One step to search, one to mark a guided lesson's start, one to answer,
// and one to correct an edit proposal the draft guards rejected (a valid
// proposal ends the reply, so that step runs only after a rejection). Keep
// tool definitions stable for history; completed one-shot actions are hidden,
// and after an exit only the closing prose remains available.
const ASSISTANT_MAX_MODEL_STEPS = 4;
const LESSON_SUMMARY_MAX_OUTPUT_TOKENS = 900;

interface StreamAssistantReplyForUserInput {
  userId: string;
  messages: AssistantChatRequest["messages"];
  /** `useChat` id; keeps the chat's turns on one provider's prompt cache. */
  chatId?: string;
  draft?: AssistantChatRequest["draft"];
  context?: AssistantChatRequest["context"];
  documentDraft?: AssistantChatRequest["documentDraft"];
  historyTruncated?: boolean;
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
  historyTruncated,
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

  const summary = readRequestedLessonSummary(messages);
  const studyAnswer = isStudyAnswerTurn(messages);
  const lessonTopic = summary ? null : readActiveLessonTopic(messages);
  const response = await streamChatResponse({
    settings: access.settings,
    logScope: "assistant.chat",
    instructions: buildAssistantSystemPrompt(),
    messages: assembleAssistantMessages(
      summary
        ? {
            messages: summary.messages,
            lessonSummaryTopic: summary.topic,
            historyTruncated,
          }
        : {
            messages,
            draft,
            context,
            documentDraft,
            lessonTopic,
            historyTruncated,
          },
      summary ? [] : await loadSubjectPaths(userId),
    ),
    maxOutputTokens: summary
      ? LESSON_SUMMARY_MAX_OUTPUT_TOKENS
      : AI_LIMITS.assistantMaxOutputTokens,
    tools: buildAssistantTools(bindLibrarySearchToUser(searchLibrary, userId), {
      draft,
      documentDraft,
      context,
      lessonTopic,
      studyAnswer,
    }),
    activeTools: summary
      ? []
      : selectAssistantActiveTools({
          draft,
          documentDraft,
          lessonActive: lessonTopic !== null,
          studyAnswer,
        }),
    maxModelSteps: summary ? 1 : ASSISTANT_MAX_MODEL_STEPS,
    stopAfterTools: ["askStudyQuestion"],
    disableToolsAfter: ["endGuidedLesson"],
    singleUseTools: ["startGuidedLesson", "searchLibrary"],
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
