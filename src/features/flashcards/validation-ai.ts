import { z } from "zod";
import type { ResolvedUserAiSettings } from "@/features/ai/settings";
import { generateStructuredOutput } from "@/lib/ai/generate-structured";

const MAX_VALIDATION_TOKENS = 500;

export const flashcardValidationIssueTypeEnum = z.enum([
  "incorrect",
  "confusing",
  "duplicate",
]);

export type FlashcardValidationIssueType = z.infer<
  typeof flashcardValidationIssueTypeEnum
>;

const flashcardValidationIssueSchema = z.object({
  flashcardId: z.string(),
  issueType: flashcardValidationIssueTypeEnum,
  explanation: z.string().trim().min(1).max(300),
  relatedFlashcardId: z.string().optional(),
});

const flashcardValidationOutputSchema = z.object({
  issues: z.array(flashcardValidationIssueSchema),
});

export type FlashcardValidationIssue = z.infer<
  typeof flashcardValidationIssueSchema
>;

export type FlashcardValidationOutput = z.infer<
  typeof flashcardValidationOutputSchema
>;

const flashcardValidationSystemPrompt = `You are a flashcard quality validator. Analyze flashcards for three types of issues:

1. **Incorrect Information**: The back contains factual errors, outdated information, or incorrect answers to the front.
2. **Confusing Content**: The front or back is ambiguous, poorly worded, too broad, or unclear. The card is hard to study effectively.
3. **Duplicate**: Two flashcards ask essentially the same question with the same answer. This is rare. When in doubt, do not flag.

Rules:
- Only report actual issues. Do not flag cards that are acceptable.
- For incorrect information, explain what is wrong and why.
- For confusing content, explain what makes it unclear or how it could be improved.
- For duplicates, include relatedFlashcardId for the similar card. In the explanation, briefly state the issue without referencing the card name or adding parentheticals—the relatedFlashcardId field handles the link. Example: "Tests the same concept." NOT "Tests the same concept as the card 'X'. (Related: 'X')"
- **Related concepts are NOT duplicates**: Cards on the same topic but testing different knowledge are valuable, not duplicates. Examples that should NOT be flagged:
  - "What is KPI?" and "What are metrics?" — different concepts, even if related
  - "CLI interaction" and "System calls" — different interaction types, even if both about OS
  - "Define X" and "Examples of X" — definition vs. examples, different knowledge
  - "What does X do?" and "How does X work?" — different aspects of the same topic
- Only flag duplicates when BOTH the front AND back are effectively equivalent. If in doubt, skip it.
- Subject context is provided for reference. Use it to assess correctness.
- Be strict but fair. Minor wording variations are acceptable.
- Empty output (no issues) is valid if all cards are good.
- **[Image] indicates visual content**: When you see "[Image]" in a card, it means the card contains an image. This counts as valid content, not empty content. Do not flag cards as confusing or empty just because they contain "[Image]" placeholders.

Output format:
- Array of issues with flashcardId, issueType, explanation
- For duplicate issues, include relatedFlashcardId pointing to the similar card
- Keep explanations concise (under 300 characters)
- Explanations must be actionable and specific
- **Use exact IDs**: When reporting issues, use the exact ID value from the input. If the input shows "Card 1 (ID: abc123)", use flashcardId: "abc123" (not "1", not "Card 1", not "Card 1 (ID: abc123)").`;

interface FlashcardForValidation {
  id: string;
  front: string;
  back: string;
  subjectName: string;
}

function buildValidateFlashcardsPrompt(
  flashcards: FlashcardForValidation[],
): string {
  const cards = flashcards
    .map(
      (card, index) =>
        `Card ${index + 1} (ID: ${card.id})
Subject: ${card.subjectName}
Front: ${card.front}
Back: ${card.back}`,
    )
    .join("\n\n");

  return `Analyze the following flashcards and report any issues:

${cards}`;
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
    maxOutputTokens: MAX_VALIDATION_TOKENS,
  });

  return output;
}
