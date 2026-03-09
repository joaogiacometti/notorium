import { resolveRequiredUserAiSettings } from "@/features/ai/settings";
import { generateFlashcardBackContent } from "@/features/flashcards/ai";
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
