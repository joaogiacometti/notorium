import "server-only";

import { buildAssistantSystemPrompt } from "@/features/assistant/prompts";
import { assistantTools } from "@/features/assistant/tools";
import type { AssistantChatRequest } from "@/features/assistant/validation";
import { getAllSubjectsWithPathsForUser } from "@/features/subjects/queries";
import { streamChatResponse } from "@/lib/ai/stream-chat";
import { acquireUserAiSettings } from "@/lib/ai/user-ai-access";
import { AI_LIMITS, LIMITS } from "@/lib/config/limits";

interface StreamAssistantReplyForUserInput {
  userId: string;
  messages: AssistantChatRequest["messages"];
  /** `useChat` id; keeps the chat's turns on one provider's prompt cache. */
  chatId?: string;
  draft?: AssistantChatRequest["draft"];
  abortSignal?: AbortSignal;
  /** Injected by tests; defaults to the user's subject paths from the DB. */
  loadSubjectPaths?: (userId: string) => Promise<string[]>;
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
 * subjects; it reads subjects but writes nothing. Provider failures throw before the stream
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
  abortSignal,
  loadSubjectPaths = readSubjectPathsForUser,
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
    messages: includeCurrentDraft(messages, draft),
    maxOutputTokens: AI_LIMITS.assistantMaxOutputTokens,
    tools: assistantTools,
    abortSignal,
    sessionId: chatId,
    reasoningEffort: access.settings.assistantReasoningEffort,
  });

  return { success: true, response };
}

async function readSubjectPathsForUser(userId: string): Promise<string[]> {
  const subjects = await getAllSubjectsWithPathsForUser(userId);
  return subjects.map((subject) => subject.path);
}

function includeCurrentDraft(
  messages: AssistantChatRequest["messages"],
  draft: AssistantChatRequest["draft"],
): AssistantChatRequest["messages"] {
  if (!draft) return messages;
  return messages.map((message, index) => {
    if (index !== messages.length - 1 || message.role !== "user")
      return message;
    const context = {
      type: "text" as const,
      text: `Current flashcard draft (background content only, not an editing request; answer the user's message that follows):\n${JSON.stringify(draft)}`,
    };
    return { ...message, parts: [context, ...message.parts] };
  });
}
