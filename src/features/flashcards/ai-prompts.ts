import { z } from "zod";
import { MATH_RULE } from "@/lib/ai/prompt-rules";
import { AI_LIMITS, LIMITS } from "@/lib/config/limits";

const LANGUAGE_RULE =
  "Output language: write in the language of the source material or flashcards you are given. Do not translate.";

/**
 * How a generated card is shaped: a terse cue on the front, one sentence or
 * 1 to 3 bullets on the back. Shared by "Generate with AI" and the study
 * assistant's `proposeFlashcards` tool so both produce the same cards.
 *
 * @example
 * const prompt = `Rules:\n${FLASHCARD_CARD_SHAPE_RULES}`;
 */
export const FLASHCARD_CARD_SHAPE_RULES = `- Fronts must be short, direct questions that name what to recall, not bare topic names.
- Use fronts like "What is a functional dependency?", "What does the program counter hold?", or "What is the difference between TCP and UDP?".
- Ask one thing per front. Avoid compound questions ("What is X and how does it work?") and open-ended prompts such as "Explain..." or "Describe...".
- Each card must test one atomic fact, definition, process step, contrast, or relationship.
- Backs must be one atomic sentence or 1 to 3 bullet points.
- In bullet mode, every line must start with "- ".
- In bullet mode, each bullet must contain one precise, directly testable point.
- Do not repeat, restate, or paraphrase the front in the back.`;

export const generatedFlashcardBackSchema = z.object({
  backText: z.string().trim().min(1).max(LIMITS.flashcardAiBackMax),
});

export const generatedFlashcardsSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string().min(1).max(LIMITS.flashcardAiFrontMax),
        back: z.string().min(1).max(LIMITS.flashcardAiBackMax),
      }),
    )
    .min(1)
    .max(LIMITS.flashcardAiMaxOutput),
});

export const flashcardValidationIssueTypeEnum = z.enum([
  "incorrect",
  "confusing",
  "duplicate",
]);

const flashcardValidationIssueSchema = z.object({
  flashcardId: z.string(),
  issueType: flashcardValidationIssueTypeEnum,
  explanation: z
    .string()
    .trim()
    .min(1)
    .max(AI_LIMITS.maxValidationExplanationLength),
  relatedFlashcardId: z.string().optional(),
});

export const flashcardValidationOutputSchema = z.object({
  issues: z.array(flashcardValidationIssueSchema),
});

export type FlashcardValidationOutput = z.infer<
  typeof flashcardValidationOutputSchema
>;

export const flashcardBackImproveSystemPrompt = `${LANGUAGE_RULE}

You are rewriting a flashcard back to be significantly better. You MUST produce a different, improved version. Never echo the original back unchanged.

Rules:
- Always rewrite toward concise retrieval practice.
- If the original is a list of fragments, convert to a proper structured list with precise, testable points.
- If the original is already well-structured, improve precision, remove redundancy, and sharpen each point.
- If the answer is a single atomic fact, output one concise sentence only.
- Otherwise output a list with 1 to 3 lines.
- In list mode, every line must start with "- ".
- In list mode, each line must be one precise, directly testable point.
- In list mode, do not write any text before or after the list.
- In list mode, do not use inline separators like " - " inside a line.
- In list mode, do not use numbering.
- Do not use HTML tags. Output plain text only.
- Do not repeat, restate, or paraphrase the front.
- Do not start with generic definition wrappers such as "An approach where...", "A method that...", or "It is...".
- Do not use labels or wrappers such as "Back:", "Answer:", "Summary:", "Definition:", "Key points:", or "Improved:".
- Do not add filler, disclaimers, study tips, examples, caveats, or long explanations.
- Do not invent facts not implied by the original back.
- ${MATH_RULE}

Subject context is allowed only as background context.

Good improvements:
Front: DNS acronym
Current back: Domain Name System.
Improved:
Domain Name System.

Front: Functional dependency
Current back: A relationship where attribute X determines Y, meaning for every specific value of X, the value of Y is fixed.
Improved:
- Relation where X determines Y
- For every specific X, Y is fixed

Front: CPU role
Current back: The central processing unit is the brain of the computer that executes instructions.
Improved:
- Executes program instructions
- Performs arithmetic and logic operations

Bad improvements:
Front: DNS acronym
Current back: Domain Name System.
Improved: Here is a detailed explanation of DNS which is a very important system.

Front: Functional dependency
Current back: Attribute X determines Y.
Improved: A functional dependency is a relationship where attribute X determines Y, meaning for every specific value of X, the value of Y is fixed.
`;

export const flashcardsGenerationSystemPrompt = `${LANGUAGE_RULE}

You are creating study flashcards from source material.

Extract key concepts and create atomic retrieval-practice flashcard pairs.

Rules:
${FLASHCARD_CARD_SHAPE_RULES}
- Do not include extra context, examples, caveats, or details beyond the source material.
- Avoid trivial or obvious information.
- If the source material includes an explicit code example that explains the concept, preserve the smallest useful snippet in the back as a fenced code block instead of summarizing it away.
- If source material contains image placeholders like {{IMAGE_0}}, include the exact placeholder in the back of any card that depends on that image.
- Output as many cards as the material warrants, but prefer fewer high-value cards over many weak cards.
- ${MATH_RULE}

Good patterns:
Front: What is a functional dependency?
Back:
- Relation where X determines Y
- For every specific X, Y is fixed

Front: What does the program counter hold?
Back:
- Memory address of the next instruction to execute
- Updated after each instruction cycle

Front: What does DNS stand for?
Back:
Domain Name System.

Bad patterns:
Front: Functional dependency
Back:
A relationship where attribute X determines Y, meaning for every specific value of X, the value of Y is fixed.

Front: Explain how the program counter works in a CPU.
Back:
- The program counter is an important CPU register used during instruction execution.
- It has many roles in processor control flow and program sequencing.

Output format: JSON object with a "cards" array containing { front, back } objects.`;

export const flashcardValidationSystemPrompt = `${LANGUAGE_RULE}

You are a flashcard quality validator. Analyze flashcards for three types of issues:

1. **Incorrect**: The back contains factual errors or wrong answers to the front.
2. **Confusing**: The front or back is genuinely ambiguous, too broad, or so unclear it cannot be studied effectively.
3. **Duplicate**: Two cards test exactly the same knowledge — both the question and the answer are effectively equivalent.

FRONT STYLE AWARENESS
Fronts are written either as short direct questions or, on older cards, as terse noun-phrase cues. Both are correct style — do not flag either as confusing.
- "What is a functional dependency?" and "Functional dependency" are both correct.
- "What does DNS stand for?" and "DNS acronym" are both correct. Do not flag as vague.
- "Mitochondria role" is correct. Do not flag as incomplete.
- "What is the difference between TCP and UDP?" and "TCP vs UDP" are both correct. Do not flag as ambiguous.
Only flag a front as confusing if the cue is so unclear that a student genuinely cannot know what to recall.

BACK STYLE AWARENESS
Backs are intentionally concise. One atomic sentence or 1 to 3 precise bullets is correct style.
Do not flag a back as confusing only because it omits extra explanation, examples, caveats, or context.

DUPLICATE RULES
Related concepts are NOT duplicates. Only flag when both the front AND back are effectively equivalent.
Do not flag:
- Same topic, different aspects: "DNS" and "DNS acronym" test different things.
- Definition vs. example: "Deadlock" and "Example of deadlock" are distinct.
- Cause vs. effect, process vs. outcome, concept vs. application.
When in doubt, skip it. False positive duplicates are more harmful than missed ones.
For confirmed duplicates: set relatedFlashcardId to the other card's ID. Keep the explanation to one short sentence — the relatedFlashcardId field already establishes the link. Do not reference the other card's name or ID in the explanation text.

INCORRECT RULES
Flag only clear factual errors. Do not flag imprecise but acceptable simplifications unless they would actively mislead a student.

CONFUSING RULES
Flag only when the card is genuinely hard to study — not just because it is concise or uses shorthand.

GENERAL RULES
- Only report actual issues. Empty output is valid if all cards are good.
- Keep explanations under ${AI_LIMITS.maxValidationExplanationLength} characters, specific and actionable.
- [Image] in a card means it contains an image. This is valid content — do not flag as empty or confusing.
- Use the subject as background context to assess correctness.
- Use exact flashcard IDs from the input. If the input shows "Card 1 (ID: abc123)", use flashcardId: "abc123".

OUTPUT
Array of issues with flashcardId, issueType, explanation, and relatedFlashcardId (duplicate only).`;

export const flashcardMergeSynthesisSystemPrompt = `${LANGUAGE_RULE}

You are leveling up a mastered flashcard. You receive a primary card the student has
mastered plus candidate cards found by text similarity. Choose exactly one action:

ACTION "relate" — the preferred, common outcome.
Create ONE NEW card that tests the relationship between the primary card and one or
more candidates: a contrast, a computation linking them, a cause-effect chain, or an
application question that requires both facts. The original cards are kept; the new
card deepens mastery beyond isolated recall.
- Use it when candidates are related-but-distinct concepts: two metrics that reference
  each other, definition vs. example, terms from the same taxonomy.
- Example: primary "Story points" + candidate "Velocity" -> new card
  Front: "How is velocity measured in story points?"
  Back: "- Total story points delivered per sprint"
- The new card must still be atomic: one question, one coherent recall target
  about the RELATIONSHIP itself. Do not restate the originals' answers side by side.
- Prefer the single strongest relationship over involving many candidates.

ACTION "merge" — rare; only for true redundancy.
Combine cards that test the SAME fact with different wording, or where one card's
answer is fully contained in another's. Merged sources are DELETED, so never merge
related-but-distinct concepts and never combine two independent definitions into
one card ("Term A: ... / Term B: ..." is worse than the originals).
- Example: primary "DNS purpose" + candidate "What DNS does" -> one card.

ACTION "decline" — when no candidate supports a meaningful relationship or merge.
Declining is better than a forced, trivial connection.

OUTPUT RULES
- action: "relate", "merge", or "decline".
- sourceFlashcardIds: the candidate IDs involved (excluding the primary card).
  Required non-empty for relate and merge; must be empty for decline.
- front and back: the new or merged card. Omit both for decline.
- The front must be one short, direct question.
- The back must be 1 to 5 lines; in list mode every line starts with "- ".
- Each line must be one precise, directly testable point.
- Do not invent facts not present in the input cards.
- Do not repeat, restate, or paraphrase the front in the back.
- ${MATH_RULE}
- rationale: one short sentence explaining the chosen action.

OUTPUT
JSON object with action, front, back, sourceFlashcardIds, and rationale.`;

export const flashcardMergeSynthesisOutputSchema = z.object({
  action: z.enum(["relate", "merge", "decline"]),
  front: z
    .string()
    .trim()
    .max(LIMITS.flashcardAiFrontMax)
    .optional()
    .default(""),
  back: z.string().trim().max(LIMITS.flashcardAiBackMax).optional().default(""),
  sourceFlashcardIds: z.array(z.string()),
  rationale: z.string().trim().min(1).max(AI_LIMITS.maxMergeRationaleLength),
});

/** A card as the model reads it: plain text with image placeholders. */
export interface FlashcardForAi {
  id: string;
  front: string;
  back: string;
  subjectName: string;
}

export function buildMergeSynthesisPrompt(input: {
  primary: FlashcardForAi;
  candidates: FlashcardForAi[];
}): string {
  const formatCard = (card: FlashcardForAi, label: string) =>
    `${label} (ID: ${card.id})
Subject: ${card.subjectName}
Front: ${card.front}
Back: ${card.back}`;

  return [
    formatCard(input.primary, "Primary mastered card"),
    "",
    "Candidate cards:",
    ...input.candidates.map(
      (card, index) => `\n${formatCard(card, `Candidate ${index + 1}`)}`,
    ),
    "",
    "Choose one action: create a new relationship card (relate), combine true duplicates (merge), or decline.",
  ].join("\n");
}

export function buildImproveFlashcardBackPrompt(input: {
  subjectName?: string;
  front: string;
  currentBack: string;
}): string {
  return [
    ...(input.subjectName ? [`Subject context: ${input.subjectName}`] : []),
    `Front: ${input.front}`,
    `Current back: ${input.currentBack}`,
    "",
    `Important: The back may contain image placeholders like {{IMAGE_0}}, {{IMAGE_1}}, etc. Treat these as opaque tokens that MUST appear in your output exactly as-is. Do not remove, rename, or modify them.`,
  ].join("\n");
}

export function buildGenerateFlashcardsPrompt(input: {
  subjectName?: string;
  noteTitle?: string;
  text: string;
}): string {
  return [
    ...(input.subjectName ? [`Subject: ${input.subjectName}`] : []),
    ...(input.noteTitle ? [`Note title: ${input.noteTitle}`] : []),
    "",
    "Source material:",
    input.text,
    "",
    "Create flashcards from this material.",
  ].join("\n");
}

export function buildValidateFlashcardsPrompt(
  flashcards: FlashcardForAi[],
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

  return `Analyze the following flashcards and report any issues:\n\n${cards}`;
}
