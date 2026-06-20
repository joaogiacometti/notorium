import { getServerEnv } from "@/env";
import {
  buildGenerateFlashcardBackPrompt,
  buildGenerateFlashcardsPrompt,
  buildImproveFlashcardBackPrompt,
  buildMergeSynthesisPrompt,
  buildValidateFlashcardsPrompt,
  type FlashcardForMergeSynthesis,
  type FlashcardForValidation,
  type FlashcardValidationOutput,
  flashcardBackImproveSystemPrompt,
  flashcardBackSystemPrompt,
  flashcardMergeSynthesisOutputSchema,
  flashcardMergeSynthesisSystemPrompt,
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

export const PLAYWRIGHT_REFINE_PROPOSAL = {
  action: "relate" as const,
  front: "Playwright fixture relation front: recall vs spacing",
  back: "- Active recall produces the answer; spaced repetition times the next attempt",
  rationale: "Playwright fixture rationale: both cards cover retention.",
};

export interface RefineProposalSynthesis {
  action: "relate" | "merge";
  front: string;
  back: string;
  sourceFlashcardIds: string[];
  rationale: string;
}

/**
 * Propose a level-up for a mastered card: either a new relationship card
 * (originals kept) or a merge of true duplicates (sources deleted). Returns
 * null when the model declines because no candidate supports either.
 *
 * Example: await synthesizeRefineProposalWithAi({ settings, primary, candidates });
 */
export async function synthesizeRefineProposalWithAi(input: {
  settings: ResolvedAiSettings;
  primary: FlashcardForMergeSynthesis;
  candidates: FlashcardForMergeSynthesis[];
}): Promise<RefineProposalSynthesis | null> {
  if (isPlaywrightAiFixtureMode()) {
    return {
      ...PLAYWRIGHT_REFINE_PROPOSAL,
      front: plainTextToRichText(PLAYWRIGHT_REFINE_PROPOSAL.front),
      back: plainTextToRichText(PLAYWRIGHT_REFINE_PROPOSAL.back),
      sourceFlashcardIds: input.candidates.map((card) => card.id),
    };
  }

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: flashcardMergeSynthesisOutputSchema,
    system: flashcardMergeSynthesisSystemPrompt,
    prompt: buildMergeSynthesisPrompt({
      primary: input.primary,
      candidates: input.candidates,
    }),
    maxOutputTokens: AI_LIMITS.maxMergeSynthesisTokens,
  });

  const candidateIds = new Set(input.candidates.map((card) => card.id));
  const sourceFlashcardIds = output.sourceFlashcardIds.filter((id) =>
    candidateIds.has(id),
  );

  if (output.action === "decline" || sourceFlashcardIds.length === 0) {
    return null;
  }

  if (output.front.length === 0 || output.back.length === 0) {
    throw new Error(
      `Refine proposal "${output.action}" returned empty content: front="${output.front}", back="${output.back}"`,
    );
  }

  const back = plainTextToRichText(normalizeGeneratedBack(output.back));
  const parsedBack = flashcardBackSchema.safeParse(back);

  if (!parsedBack.success) {
    throw new Error(
      `Invalid refine proposal back generated: ${parsedBack.error.message}`,
    );
  }

  return {
    action: output.action,
    front: plainTextToRichText(normalizeLine(output.front)),
    back: parsedBack.data,
    sourceFlashcardIds,
    rationale: output.rationale,
  };
}

export type {
  FlashcardForMergeSynthesis,
  FlashcardForValidation,
  FlashcardValidationOutput,
} from "@/features/flashcards/ai-prompts";
