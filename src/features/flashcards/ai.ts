import type { ResolvedUserAiSettings } from "@/features/ai/queries";
import {
  buildGenerateFlashcardBackPrompt,
  buildGenerateFlashcardsPrompt,
  buildImproveFlashcardBackPrompt,
  buildValidateFlashcardsPrompt,
  type FlashcardForValidation,
  type FlashcardValidationOutput,
  flashcardBackImproveSystemPrompt,
  flashcardBackSystemPrompt,
  flashcardsGenerationSystemPrompt,
  flashcardValidationOutputSchema,
  flashcardValidationSystemPrompt,
  generatedFlashcardBackSchema,
  generatedFlashcardsSchema,
  normalizeGeneratedCards,
} from "@/features/flashcards/ai-prompts";
import {
  normalizeGeneratedBack,
  normalizeLine,
  plainTextToRichText,
} from "@/features/flashcards/ai-utils";
import { flashcardBackSchema } from "@/features/flashcards/validation";
import { generateStructuredOutput } from "@/lib/ai/generate-structured";
import { AI_LIMITS } from "@/lib/config/limits";
import {
  replaceImagesWithPlaceholders,
  restoreImagePlaceholders,
  richTextToPlainText,
} from "@/lib/editor/rich-text";

export type { FlashcardValidationOutput };
export type { FlashcardForValidation };

export async function generateFlashcardBackContent(input: {
  settings: ResolvedUserAiSettings;
  subjectName: string;
  front: string;
}): Promise<string> {
  const frontText = normalizeLine(richTextToPlainText(input.front));

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardBackSchema,
    system: flashcardBackSystemPrompt,
    prompt: buildGenerateFlashcardBackPrompt({
      subjectName: input.subjectName,
      front: frontText,
    }),
    maxOutputTokens: AI_LIMITS.maxBackTokens,
  });

  const back = plainTextToRichText(normalizeGeneratedBack(output.backText));
  const parsedBack = flashcardBackSchema.safeParse(back);

  if (!parsedBack.success) {
    throw new Error(
      `Invalid flashcard back generated: ${parsedBack.error.message}`,
    );
  }

  return parsedBack.data;
}

export async function improveFlashcardBackContent(input: {
  settings: ResolvedUserAiSettings;
  subjectName: string;
  front: string;
  currentBack: string;
}): Promise<string> {
  const frontText = normalizeLine(richTextToPlainText(input.front));
  const { text: backWithPlaceholders, images } = replaceImagesWithPlaceholders(
    input.currentBack,
  );
  // Note: richTextToPlainText preserves text nodes like {{IMAGE_N}},
  // which is required for image placeholder restoration after AI generation.
  const backText = normalizeLine(richTextToPlainText(backWithPlaceholders));

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardBackSchema,
    system: flashcardBackImproveSystemPrompt,
    prompt: buildImproveFlashcardBackPrompt({
      subjectName: input.subjectName,
      front: frontText,
      currentBack: backText,
    }),
    maxOutputTokens: AI_LIMITS.improveMaxTokens,
  });

  const back = plainTextToRichText(normalizeGeneratedBack(output.backText));
  const parsedBack = flashcardBackSchema.safeParse(back);

  if (!parsedBack.success) {
    throw new Error(
      `Invalid flashcard back generated: ${parsedBack.error.message}`,
    );
  }

  return restoreImagePlaceholders(parsedBack.data, images);
}

export async function generateFlashcardsFromText(input: {
  settings: ResolvedUserAiSettings;
  subjectName: string;
  text: string;
}): Promise<Array<{ front: string; back: string }>> {
  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardsSchema,
    system: flashcardsGenerationSystemPrompt,
    prompt: buildGenerateFlashcardsPrompt({
      subjectName: input.subjectName,
      text: input.text,
    }),
    maxOutputTokens: AI_LIMITS.maxGenerationTokens,
  });

  const cards = normalizeGeneratedCards(output);

  if (!cards) {
    throw new Error("Generated flashcards failed validation");
  }

  return cards;
}

export async function validateFlashcardsWithAi(input: {
  settings: ResolvedUserAiSettings;
  flashcards: FlashcardForValidation[];
}): Promise<FlashcardValidationOutput> {
  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: flashcardValidationOutputSchema,
    system: flashcardValidationSystemPrompt,
    prompt: buildValidateFlashcardsPrompt(input.flashcards),
    maxOutputTokens: AI_LIMITS.maxValidationTokens,
  });

  return output;
}
