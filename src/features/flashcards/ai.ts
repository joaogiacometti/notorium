import { getServerEnv } from "@/env";
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
import type { ResolvedAiSettings } from "@/lib/ai/config";
import { generateStructuredOutput } from "@/lib/ai/generate-structured";
import { AI_LIMITS } from "@/lib/config/limits";
import {
  replaceImagesWithPlaceholders,
  restoreImagePlaceholders,
  richTextToPlainText,
} from "@/lib/editor/rich-text";

export type { FlashcardValidationOutput };
export type { FlashcardForValidation };

export const PLAYWRIGHT_GENERATED_BACK =
  "Playwright fixture back: photosynthesis converts light energy into stored chemical energy.";

export const PLAYWRIGHT_GENERATED_CARDS = [
  {
    front: "Playwright fixture card 1: What does active recall improve?",
    back: "Active recall strengthens retrieval practice by requiring learners to produce an answer.",
  },
  {
    front: "Playwright fixture card 2: What does spaced repetition optimize?",
    back: "Spaced repetition schedules reviews near the point of forgetting.",
  },
];

function isPlaywrightAiFixtureMode() {
  return getServerEnv().NOTORIUM_AI_FIXTURE_MODE === "playwright";
}

export async function generateFlashcardBackContent(input: {
  settings: ResolvedAiSettings;
  subjectName?: string;
  deckName?: string;
  front: string;
}): Promise<string> {
  if (isPlaywrightAiFixtureMode()) {
    return plainTextToRichText(PLAYWRIGHT_GENERATED_BACK);
  }

  const frontText = normalizeLine(richTextToPlainText(input.front));

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardBackSchema,
    system: flashcardBackSystemPrompt,
    prompt: buildGenerateFlashcardBackPrompt({
      subjectName: input.subjectName,
      deckName: input.deckName,
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
  settings: ResolvedAiSettings;
  subjectName?: string;
  deckName?: string;
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
      deckName: input.deckName,
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
  settings: ResolvedAiSettings;
  subjectName?: string;
  deckName?: string;
  text: string;
}): Promise<Array<{ front: string; back: string }>> {
  if (isPlaywrightAiFixtureMode()) {
    return PLAYWRIGHT_GENERATED_CARDS;
  }

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardsSchema,
    system: flashcardsGenerationSystemPrompt,
    prompt: buildGenerateFlashcardsPrompt({
      subjectName: input.subjectName,
      deckName: input.deckName,
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
  settings: ResolvedAiSettings;
  flashcards: FlashcardForValidation[];
}): Promise<FlashcardValidationOutput> {
  if (isPlaywrightAiFixtureMode()) {
    const issueCard = input.flashcards.find((card) =>
      card.front.includes("fixture issue"),
    );

    return {
      issues: issueCard
        ? [
            {
              flashcardId: issueCard.id,
              issueType: "confusing",
              explanation: "Playwright fixture issue: answer is too vague.",
            },
          ]
        : [],
    };
  }

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: flashcardValidationOutputSchema,
    system: flashcardValidationSystemPrompt,
    prompt: buildValidateFlashcardsPrompt(input.flashcards),
    maxOutputTokens: AI_LIMITS.maxValidationTokens,
  });

  return output;
}
