import type { ResolvedUserAiSettings } from "@/features/ai/settings";
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
  plainTextToRichText,
} from "@/features/flashcards/ai-utils";
import { flashcardBackSchema } from "@/features/flashcards/validation";
import { generateStructuredOutput } from "@/lib/ai/generate-structured";
import { AI_LIMITS } from "@/lib/config/limits";
import { richTextToPlainText } from "@/lib/editor/rich-text";

export type { FlashcardValidationOutput };
export type { FlashcardForValidation };

function normalizeLine(value: string) {
  return value.replaceAll(/\s+/g, " ").trim();
}

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
  const backText = normalizeLine(richTextToPlainText(input.currentBack));

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

  return parsedBack.data;
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
