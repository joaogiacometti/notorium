import { getServerEnv } from "@/env";
import {
  buildGenerateFlashcardsPrompt,
  buildImproveFlashcardBackPrompt,
  flashcardBackImproveSystemPrompt,
  flashcardsGenerationSystemPrompt,
  generatedFlashcardBackSchema,
  generatedFlashcardsSchema,
} from "@/features/flashcards/ai-prompts";
import {
  normalizeGeneratedBack,
  normalizeGeneratedCards,
} from "@/features/flashcards/ai-utils";
import { flashcardBackSchema } from "@/features/flashcards/validation";
import type { ResolvedAiSettings } from "@/lib/ai/config";
import { generateStructuredOutput } from "@/lib/ai/generate-structured";
import {
  normalizeLine,
  plainTextToRichText,
} from "@/lib/ai/plain-text-rich-text";
import { AI_LIMITS } from "@/lib/config/limits";
import {
  replaceImagesWithPlaceholders,
  restoreImagePlaceholders,
  richTextToPlainText,
} from "@/lib/editor/rich-text";

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

// A generated back as rich text that fits a stored flashcard back.
function toGeneratedBackHtml(backText: string): string {
  const back = plainTextToRichText(normalizeGeneratedBack(backText));
  const parsedBack = flashcardBackSchema.safeParse(back);

  if (!parsedBack.success) {
    throw new Error(
      `Invalid generated flashcard back (expected rich text within the back limit): ${parsedBack.error.message}`,
    );
  }

  return parsedBack.data;
}

export async function improveFlashcardBackContent(input: {
  settings: ResolvedAiSettings;
  subjectName?: string;
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

  return restoreImagePlaceholders(toGeneratedBackHtml(output.backText), images);
}

export async function generateFlashcardsFromText(input: {
  settings: ResolvedAiSettings;
  subjectName?: string;
  noteTitle?: string;
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
      noteTitle: input.noteTitle,
      text: input.text,
    }),
    maxOutputTokens: AI_LIMITS.maxGenerationTokens,
  });

  return normalizeGeneratedCards(output);
}
