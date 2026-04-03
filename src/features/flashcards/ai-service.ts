import { resolveRequiredUserAiSettings } from "@/features/ai/settings";
import {
  generateFlashcardBackContent,
  generateFlashcardsFromText,
  improveFlashcardBackContent,
} from "@/features/flashcards/ai";
import { AiConfigurationError, AiStoredCredentialError } from "@/lib/ai/errors";

interface GenerateFlashcardBackForUserInput {
  userId: string;
  subjectName: string;
  front: string;
}

type GenerateFlashcardBackForUserResult =
  | { success: true; back: string }
  | {
      success: false;
      errorCode: "flashcards.ai.notConfigured" | "flashcards.ai.unavailable";
    };

export async function generateFlashcardBackForUser({
  userId,
  subjectName,
  front,
}: GenerateFlashcardBackForUserInput): Promise<GenerateFlashcardBackForUserResult> {
  try {
    const settings = await resolveRequiredUserAiSettings(userId);
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
    if (
      error instanceof AiConfigurationError ||
      error instanceof AiStoredCredentialError
    ) {
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
  subjectName: string;
  front: string;
  currentBack: string;
}

type ImproveFlashcardBackForUserResult =
  | { success: true; back: string }
  | {
      success: false;
      errorCode: "flashcards.ai.notConfigured" | "flashcards.ai.unavailable";
    };

export async function improveFlashcardBackForUser({
  userId,
  subjectName,
  front,
  currentBack,
}: ImproveFlashcardBackForUserInput): Promise<ImproveFlashcardBackForUserResult> {
  try {
    const settings = await resolveRequiredUserAiSettings(userId);
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
    if (
      error instanceof AiConfigurationError ||
      error instanceof AiStoredCredentialError
    ) {
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
  subjectName: string;
  text: string;
}

type GenerateFlashcardsForUserResult =
  | { success: true; cards: Array<{ front: string; back: string }> }
  | {
      success: false;
      errorCode:
        | "flashcards.ai.notConfigured"
        | "flashcards.ai.unavailable"
        | "flashcards.ai.emptyGeneration";
    };

export async function generateFlashcardsForUser({
  userId,
  subjectName,
  text,
}: GenerateFlashcardsForUserInput): Promise<GenerateFlashcardsForUserResult> {
  try {
    const settings = await resolveRequiredUserAiSettings(userId);
    const cards = await generateFlashcardsFromText({
      settings,
      subjectName,
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
    if (
      error instanceof AiConfigurationError ||
      error instanceof AiStoredCredentialError
    ) {
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
