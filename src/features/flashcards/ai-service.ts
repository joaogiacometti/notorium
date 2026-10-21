import {
  generateFlashcardsFromText,
  improveFlashcardBackContent,
} from "@/features/flashcards/ai";
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

interface GenerateFlashcardsForUserInput {
  userId: string;
  subjectName?: string;
  noteTitle?: string;
  text: string;
}

type GenerateFlashcardsForUserResult =
  | { success: true; cards: Array<{ front: string; back: string }> }
  | {
      success: false;
      errorCode:
        | "flashcards.ai.notConfigured"
        | "flashcards.ai.unavailable"
        | "flashcards.ai.emptyGeneration"
        | "limits.aiFlashcardGenerationPerDay";
    };

export async function generateFlashcardsForUser({
  userId,
  subjectName,
  noteTitle,
  text,
}: GenerateFlashcardsForUserInput): Promise<GenerateFlashcardsForUserResult> {
  return runUserAiTask({
    userId,
    logScope: "flashcards.generateCards",
    dailyLimit: {
      prefix: LIMITS.aiFlashcardGenerationRateLimitPrefix,
      limit: LIMITS.aiFlashcardGenerationRateLimitPerDay,
    },
    errorCodes: {
      ...FLASHCARD_AI_ERROR_CODES,
      limited: "limits.aiFlashcardGenerationPerDay",
    },
    run: async (settings): Promise<GenerateFlashcardsForUserResult> => {
      const cards = await generateFlashcardsFromText({
        settings,
        subjectName,
        noteTitle,
        text,
      });

      if (cards.length === 0) {
        return { success: false, errorCode: "flashcards.ai.emptyGeneration" };
      }

      return { success: true, cards };
    },
  });
}
