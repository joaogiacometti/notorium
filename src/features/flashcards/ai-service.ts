import {
  type FlashcardForAi,
  type FlashcardValidationOutput,
  generateFlashcardsFromText,
  improveFlashcardBackContent,
  type RefineProposalSynthesis,
  synthesizeRefineProposalWithAi,
  validateFlashcardsWithAi,
} from "@/features/flashcards/ai";
import { runUserAiTask } from "@/lib/ai/user-ai-access";
import { LIMITS } from "@/lib/config/limits";
import { richTextToPlainTextWithImagePlaceholders } from "@/lib/editor/rich-text";

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

interface SynthesizeRefineProposalForUserInput {
  userId: string;
  primary: FlashcardForAi;
  candidates: FlashcardForAi[];
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

  return runUserAiTask({
    userId,
    logScope: "flashcards.synthesizeRefine",
    dailyLimit: {
      prefix: LIMITS.aiMergeSynthesisRateLimitPrefix,
      limit: LIMITS.aiMergeSynthesisRateLimitPerDay,
    },
    errorCodes: {
      ...FLASHCARD_AI_ERROR_CODES,
      limited: "limits.aiMergeSynthesisPerDay",
    },
    run: async (settings): Promise<SynthesizeRefineProposalForUserResult> => {
      const synthesis = await synthesizeRefineProposalWithAi({
        settings,
        primary: toPlainAiCard(primary),
        candidates: candidates.map(toPlainAiCard),
      });

      if (!synthesis) {
        return { success: false, errorCode: "flashcards.merge.declined" };
      }

      return { success: true, synthesis };
    },
  });
}

interface ValidateFlashcardsForUserInput {
  userId: string;
  flashcards: FlashcardForAi[];
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

  return runUserAiTask({
    userId,
    logScope: "flashcards.validateCards",
    dailyLimit: {
      prefix: LIMITS.aiValidationRateLimitPrefix,
      limit: LIMITS.aiValidationRateLimitPerDay,
    },
    errorCodes: {
      notConfigured: "flashcards.validation.notConfigured",
      unavailable: "flashcards.validation.unavailable",
      limited: "limits.aiValidationPerDay",
    },
    run: async (settings) => {
      const validation = await validateFlashcardsWithAi({
        settings,
        flashcards: flashcards.map(toPlainAiCard),
      });

      return {
        success: true as const,
        validation: { issues: keepKnownCardIssues(validation, flashcards) },
      };
    },
  });
}

// The model reads plain text; images stay as placeholders.
function toPlainAiCard(card: FlashcardForAi): FlashcardForAi {
  return {
    id: card.id,
    front: richTextToPlainTextWithImagePlaceholders(card.front),
    back: richTextToPlainTextWithImagePlaceholders(card.back),
    subjectName: card.subjectName,
  };
}

// The model may cite ids it was never sent; drop those issues and dangling
// related-card links so the UI only links real rows.
function keepKnownCardIssues(
  validation: FlashcardValidationOutput,
  flashcards: FlashcardForAi[],
): FlashcardValidationOutput["issues"] {
  const validIds = new Set(flashcards.map((card) => card.id));

  return validation.issues
    .filter((issue) => validIds.has(issue.flashcardId))
    .map((issue) =>
      issue.relatedFlashcardId && !validIds.has(issue.relatedFlashcardId)
        ? { ...issue, relatedFlashcardId: undefined }
        : issue,
    );
}
