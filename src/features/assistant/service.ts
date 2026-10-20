import "server-only";

import { assistantSystemPrompt } from "@/features/assistant/prompts";
import type { AssistantChatRequest } from "@/features/assistant/validation";
import { streamChatResponse } from "@/lib/ai/stream-chat";
import { acquireUserAiSettings } from "@/lib/ai/user-ai-access";
import { AI_LIMITS, LIMITS } from "@/lib/config/limits";

interface StreamAssistantReplyForUserInput {
  userId: string;
  messages: AssistantChatRequest["messages"];
  abortSignal?: AbortSignal;
}

type StreamAssistantReplyForUserResult =
  | { success: true; response: Response }
  | {
      success: false;
      errorCode: "assistant.notConfigured" | "limits.aiAssistantPerDay";
    };

/**
 * Stream one study-assistant reply for a user's chat, spending one unit of the
 * user's daily assistant limit. Provider failures throw before the stream
 * starts; the route maps them to `assistant.unavailable`.
 *
 * @example
 * const result = await streamAssistantReplyForUser({ userId, messages });
 * if (result.success) return result.response;
 */
export async function streamAssistantReplyForUser({
  userId,
  messages,
  abortSignal,
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
    instructions: assistantSystemPrompt,
    messages,
    maxOutputTokens: AI_LIMITS.assistantMaxOutputTokens,
    abortSignal,
  });

  return { success: true, response };
}
