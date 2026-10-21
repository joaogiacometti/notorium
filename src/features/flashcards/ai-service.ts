import { improveFlashcardBackContent } from "@/features/flashcards/ai";
import { runUserAiTask } from "@/lib/ai/user-ai-access";
import { LIMITS } from "@/lib/config/limits";

const FLASHCARD_AI_ERROR_CODES = {
  notConfigured: "flashcards.ai.notConfigured",
  unavailable: "flashcards.ai.unavailable",
} as const;

interface ImproveFlashcardBackForUserInput {
  userId: string;
  subjectName?: string;
  front: string;
  currentBack: string;
}

type ImproveFlashcardBackForUserResult =
  | { success: true; back: string }
  | {
      success: false;
      errorCode:
        | "flashcards.ai.notConfigured"
        | "flashcards.ai.unavailable"
        | "limits.aiBackGenerationPerDay";
    };

export async function improveFlashcardBackForUser({
  userId,
  subjectName,
  front,
  currentBack,
}: ImproveFlashcardBackForUserInput): Promise<ImproveFlashcardBackForUserResult> {
  return runUserAiTask({
    userId,
    logScope: "flashcards.improveBack",
    dailyLimit: {
      prefix: LIMITS.aiBackGenerationRateLimitPrefix,
      limit: LIMITS.aiBackGenerationRateLimitPerDay,
    },
    errorCodes: {
      ...FLASHCARD_AI_ERROR_CODES,
      limited: "limits.aiBackGenerationPerDay",
    },
    run: async (settings) => ({
      success: true as const,
      back: await improveFlashcardBackContent({
        settings,
        subjectName,
        front,
        currentBack,
      }),
    }),
  });
}
