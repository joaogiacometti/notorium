import {
  type FlashcardForValidation,
  type FlashcardValidationOutput,
  generateFlashcardBackContent,
  generateFlashcardsFromText,
  improveFlashcardBackContent,
  validateFlashcardsWithAi,
} from "@/features/flashcards/ai";
import { resolveRequiredAiSettings } from "@/lib/ai/config";
import { AiConfigurationError } from "@/lib/ai/errors";
import { LIMITS } from "@/lib/config/limits";
import { richTextToPlainTextWithImagePlaceholders } from "@/lib/editor/rich-text";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";

interface GenerateFlashcardBackForUserInput {
  userId: string;
  subjectName?: string;
  deckName?: string;
  front: string;
}

type GenerateFlashcardBackForUserResult =
  | { success: true; back: string }
  | {
      success: false;
      errorCode:
        | "flashcards.ai.notConfigured"
        | "flashcards.ai.unavailable"
        | "limits.aiBackGenerationPerDay";
    };

export async function generateFlashcardBackForUser({
  userId,
  subjectName,
  deckName,
  front,
}: GenerateFlashcardBackForUserInput): Promise<GenerateFlashcardBackForUserResult> {
  try {
    const settings = resolveRequiredAiSettings();
    const limitResult = await consumeUserDailyRateLimit({
      prefix: LIMITS.aiBackGenerationRateLimitPrefix,
      userId,
      limit: LIMITS.aiBackGenerationRateLimitPerDay,
      errorCode: "limits.aiBackGenerationPerDay",
    });

    if (limitResult.limited) {
      return {
        success: false,
        errorCode: "limits.aiBackGenerationPerDay",
      };
    }

    const back = await generateFlashcardBackContent({
      settings,
      subjectName,
      deckName,
      front,
    });

    return {
      success: true,
      back,
    };
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return {
        success: false,
        errorCode: "flashcards.ai.notConfigured",
      };
    }

    return {
      success: false,
      errorCode: "flashcards.ai.unavailable",
    };
  }
}

interface ImproveFlashcardBackForUserInput {
  userId: string;
  subjectName?: string;
  deckName?: string;
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
  deckName,
  front,
  currentBack,
}: ImproveFlashcardBackForUserInput): Promise<ImproveFlashcardBackForUserResult> {
  try {
    const settings = resolveRequiredAiSettings();
    const limitResult = await consumeUserDailyRateLimit({
      prefix: LIMITS.aiBackGenerationRateLimitPrefix,
      userId,
      limit: LIMITS.aiBackGenerationRateLimitPerDay,
      errorCode: "limits.aiBackGenerationPerDay",
    });

    if (limitResult.limited) {
      return {
        success: false,
        errorCode: "limits.aiBackGenerationPerDay",
      };
    }

    const back = await improveFlashcardBackContent({
      settings,
      subjectName,
      deckName,
      front,
      currentBack,
    });

    return {
      success: true,
      back,
    };
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return {
        success: false,
        errorCode: "flashcards.ai.notConfigured",
      };
    }

    return {
      success: false,
      errorCode: "flashcards.ai.unavailable",
    };
  }
}

interface GenerateFlashcardsForUserInput {
  userId: string;
  subjectName?: string;
  deckName?: string;
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
  deckName,
  text,
}: GenerateFlashcardsForUserInput): Promise<GenerateFlashcardsForUserResult> {
  try {
    const settings = resolveRequiredAiSettings();
    const limitResult = await consumeUserDailyRateLimit({
      prefix: LIMITS.aiFlashcardGenerationRateLimitPrefix,
      userId,
      limit: LIMITS.aiFlashcardGenerationRateLimitPerDay,
      errorCode: "limits.aiFlashcardGenerationPerDay",
    });

    if (limitResult.limited) {
      return {
        success: false,
        errorCode: "limits.aiFlashcardGenerationPerDay",
      };
    }

    const cards = await generateFlashcardsFromText({
      settings,
      subjectName,
      deckName,
      text,
    });

    if (cards.length === 0) {
      return {
        success: false,
        errorCode: "flashcards.ai.emptyGeneration",
      };
    }

    return {
      success: true,
      cards,
    };
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return {
        success: false,
        errorCode: "flashcards.ai.notConfigured",
      };
    }

    return {
      success: false,
      errorCode: "flashcards.ai.unavailable",
    };
  }
}

interface ValidateFlashcardsForUserInput {
  userId: string;
  flashcards: FlashcardForValidation[];
}

type ValidateFlashcardsForUserResult =
  | { success: true; validation: FlashcardValidationOutput }
  | {
      success: false;
      errorCode:
        | "flashcards.validation.notConfigured"
        | "flashcards.validation.unavailable"
        | "flashcards.validation.noCards"
        | "limits.aiValidationPerDay";
    };

export async function validateFlashcardsForUser({
  userId,
  flashcards,
}: ValidateFlashcardsForUserInput): Promise<ValidateFlashcardsForUserResult> {
  if (flashcards.length === 0) {
    return {
      success: false,
      errorCode: "flashcards.validation.noCards",
    };
  }

  try {
    const settings = resolveRequiredAiSettings();
    const limitResult = await consumeUserDailyRateLimit({
      prefix: LIMITS.aiValidationRateLimitPrefix,
      userId,
      limit: LIMITS.aiValidationRateLimitPerDay,
      errorCode: "limits.aiValidationPerDay",
    });

    if (limitResult.limited) {
      return {
        success: false,
        errorCode: "limits.aiValidationPerDay",
      };
    }

    const flashcardsForValidation = flashcards.map((card) => ({
      id: card.id,
      front: richTextToPlainTextWithImagePlaceholders(card.front),
      back: richTextToPlainTextWithImagePlaceholders(card.back),
      deckName: card.deckName,
    }));

    const validation = await validateFlashcardsWithAi({
      settings,
      flashcards: flashcardsForValidation,
    });

    const validIds = new Set(flashcards.map((card) => card.id));

    const validIssues = validation.issues
      .map((issue) => {
        if (!validIds.has(issue.flashcardId)) {
          return null;
        }
        if (
          issue.relatedFlashcardId &&
          !validIds.has(issue.relatedFlashcardId)
        ) {
          return { ...issue, relatedFlashcardId: undefined };
        }
        return issue;
      })
      .filter((issue): issue is NonNullable<typeof issue> => issue !== null);

    return {
      success: true,
      validation: { issues: validIssues },
    };
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return {
        success: false,
        errorCode: "flashcards.validation.notConfigured",
      };
    }

    return {
      success: false,
      errorCode: "flashcards.validation.unavailable",
    };
  }
}
