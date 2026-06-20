import { answerLibraryQuestion } from "@/features/library/ask-ai";
import type { AskAiChatMessage } from "@/features/library/ask-ai-validation";
import { resolveRequiredAiSettings } from "@/lib/ai/config";
import { AiConfigurationError } from "@/lib/ai/errors";
import { LIMITS } from "@/lib/config/limits";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";

export type AskAiErrorCode =
  | "library.ai.notConfigured"
  | "library.ai.unavailable"
  | "limits.aiAskPerDay";

type AskAiAboutTextResult =
  | { success: true; answer: string }
  | { success: false; errorCode: AskAiErrorCode };

interface AskAiAboutTextForUserInput {
  userId: string;
  sourceText: string;
  messages: AskAiChatMessage[];
}

export async function askAiAboutTextForUser({
  userId,
  sourceText,
  messages,
}: AskAiAboutTextForUserInput): Promise<AskAiAboutTextResult> {
  try {
    const settings = resolveRequiredAiSettings();
    const limitResult = await consumeUserDailyRateLimit({
      prefix: LIMITS.aiAskRateLimitPrefix,
      userId,
      limit: LIMITS.aiAskRateLimitPerDay,
      errorCode: "limits.aiAskPerDay",
    });

    if (limitResult.limited) {
      return { success: false, errorCode: "limits.aiAskPerDay" };
    }

    const answer = await answerLibraryQuestion({
      settings,
      sourceText,
      messages,
    });

    return { success: true, answer };
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return { success: false, errorCode: "library.ai.notConfigured" };
    }

    return { success: false, errorCode: "library.ai.unavailable" };
  }
}
