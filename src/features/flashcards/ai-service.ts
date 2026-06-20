import {
  type FlashcardForMergeSynthesis,
  type FlashcardForValidation,
  type FlashcardValidationOutput,
  generateFlashcardBackContent,
  generateFlashcardsFromText,
  improveFlashcardBackContent,
  type RefineProposalSynthesis,
  synthesizeRefineProposalWithAi,
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
      noteTitle,
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

interface SynthesizeRefineProposalForUserInput {
  userId: string;
  primary: FlashcardForMergeSynthesis;
  candidates: FlashcardForMergeSynthesis[];
}

type SynthesizeRefineProposalForUserResult =
  | { success: true; synthesis: RefineProposalSynthesis }
  | {
      success: false;
      errorCode:
        | "flashcards.ai.notConfigured"
        | "flashcards.ai.unavailable"
        | "flashcards.merge.noCandidates"
        | "flashcards.merge.declined"
        | "limits.aiMergeSynthesisPerDay";
    };

/**
 * Rate-limited AI level-up proposal for a mastered card: a new relationship
 * card or a merge of true duplicates. The AI may decline (merge.declined).
 *
 * Example: await synthesizeRefineProposalForUser({ userId, primary, candidates });
 */
export async function synthesizeRefineProposalForUser({
  userId,
  primary,
  candidates,
}: SynthesizeRefineProposalForUserInput): Promise<SynthesizeRefineProposalForUserResult> {
  if (candidates.length === 0) {
    return {
      success: false,
      errorCode: "flashcards.merge.noCandidates",
    };
  }

  try {
    const settings = resolveRequiredAiSettings();
    const limitResult = await consumeUserDailyRateLimit({
      prefix: LIMITS.aiMergeSynthesisRateLimitPrefix,
      userId,
      limit: LIMITS.aiMergeSynthesisRateLimitPerDay,
      errorCode: "limits.aiMergeSynthesisPerDay",
    });

    if (limitResult.limited) {
      return {
        success: false,
        errorCode: "limits.aiMergeSynthesisPerDay",
      };
    }

    const toPlainCard = (card: FlashcardForMergeSynthesis) => ({
      id: card.id,
      front: richTextToPlainTextWithImagePlaceholders(card.front),
      back: richTextToPlainTextWithImagePlaceholders(card.back),
      subjectName: card.subjectName,
    });

    const synthesis = await synthesizeRefineProposalWithAi({
      settings,
      primary: toPlainCard(primary),
      candidates: candidates.map(toPlainCard),
    });

    if (!synthesis) {
      return {
        success: false,
        errorCode: "flashcards.merge.declined",
      };
    }

    return {
      success: true,
      synthesis,
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
      subjectName: card.subjectName,
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
