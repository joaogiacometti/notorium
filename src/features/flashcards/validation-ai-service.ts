import { resolveRequiredUserAiSettings } from "@/features/ai/settings";
import {
  type FlashcardValidationOutput,
  validateFlashcardsWithAi,
} from "@/features/flashcards/validation-ai";
import { AiConfigurationError, AiStoredCredentialError } from "@/lib/ai/errors";
import { richTextToPlainTextWithImagePlaceholders } from "@/lib/editor/rich-text";

interface FlashcardForValidation {
  id: string;
  front: string;
  back: string;
  subjectName: string;
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
        | "flashcards.validation.noCards";
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
    const settings = await resolveRequiredUserAiSettings(userId);

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

    const validIssues = validation.issues.filter((issue) => {
      if (!validIds.has(issue.flashcardId)) {
        return false;
      }
      if (issue.relatedFlashcardId && !validIds.has(issue.relatedFlashcardId)) {
        issue.relatedFlashcardId = undefined;
      }
      return true;
    });

    return {
      success: true,
      validation: { issues: validIssues },
    };
  } catch (error) {
    if (
      error instanceof AiConfigurationError ||
      error instanceof AiStoredCredentialError
    ) {
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
