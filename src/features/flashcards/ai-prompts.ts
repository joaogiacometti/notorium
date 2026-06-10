import { z } from "zod";
import {
  normalizeGeneratedBack,
  plainTextToRichText,
} from "@/features/flashcards/ai-utils";
import { AI_LIMITS, LIMITS } from "@/lib/config/limits";

const LANGUAGE_RULE =
  "Output language: English only. Regardless of the source material or card language, all generated text must be in English.";

const MATH_RULE =
  "Math notation: write mathematical expressions as LaTeX — $...$ for inline math (e.g. $E = mc^2$) and $$...$$ for a standalone block equation. Do not use \\( \\), \\[ \\], Unicode math symbols, or images. This LaTeX is the only exception to the plain-text rule.";

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

export type FlashcardValidationIssueType = z.infer<
  typeof flashcardValidationIssueTypeEnum
>;

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

export type FlashcardValidationIssue = z.infer<
  typeof flashcardValidationIssueSchema
>;

export type FlashcardValidationOutput = z.infer<
  typeof flashcardValidationOutputSchema
>;

export const flashcardBackSystemPrompt = `${LANGUAGE_RULE}

Write only the back of the flashcard.
Be assertive, precise, and minimal.
Write for retrieval practice: short cue on the front, compact recall target on the back.
Do not repeat, restate, or paraphrase the front.
Do not use labels such as Front or Back.
Output must be plain text only.
If the answer is a single atomic fact, output one concise sentence only.
Otherwise output a list with 1 to 3 lines.
In list mode, every line must start with "- ".
In list mode, each line must contain one precise, directly testable point.
In list mode, do not write any text before or after the list.
In list mode, do not use inline separators like " - " inside a line.
In list mode, do not use numbering.
Do not add filler, disclaimers, study tips, examples, caveats, or long explanations.
Do not start with generic definition wrappers such as "An approach where...", "A method that...", or "It is...".
Do not use labels or wrappers such as "Back:", "Answer:", "Summary:", "Definition:", or "Key points:".
Do not use bullets starting with "Example:", "E.g.", or "Ex.".
Keep the answer narrow and atomic.
If the front is broad, ambiguous, or asks for too much, answer only the most central directly testable fact — the one a student would most likely be tested on.
Do not invent extra context beyond what is needed to answer the front.
Prefer concrete wording over general wording.
Do not use markdown fences.
${MATH_RULE}

Good retrieval patterns:
Front: DNS acronym
Back:
Domain Name System.

Front: Functional dependency
Back:
- Relation where X determines Y
- For every specific X, Y is fixed

Front: CPU role
Back:
- Executes program instructions
- Performs arithmetic and logic operations
- Coordinates data flow between components

Front: Program counter
Back:
- Memory address of the next instruction to execute
- Updated after each instruction cycle

Front: Program execution stages
Back:
- Write program
- Compile or assemble to machine code
- Load into memory

Subject context is allowed only as background context.
Use the subject only as background context. Answer only what the front asks.

Bad patterns:
Front: What does DNS stand for?
Back:
- Domain Name System
- Resolves IP addresses
- Has recursive and authoritative servers

Front: Functional dependency
Back:
A relationship where attribute X determines Y, meaning for every specific value of X, the value of Y is fixed.

Front: Tabela CAN
Back: Mapeia identificadores para prioridades. - Define o acesso ao barramento. - Gerencia a arbitragem.

Front: Explain how a CPU works.
Back: Large paragraph covering many concepts.

Front: What is RAM?
Back: An architecture approach where a system temporarily stores data used by running programs.

Front: What is RAM?
Back:
Back: Temporarily stores data and instructions for the currently running program.

Front: What does DNS stand for?
Back:
Answer: Domain Name System.
`;

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
- Fronts must be concise retrieval cues, usually noun phrases, not full questions.
- Use fronts like "Functional dependency", "CPU role", or "TCP vs UDP".
- Avoid "What is...", "Explain...", or other verbose question wrappers unless needed for clarity.
- Each card must test one atomic fact, definition, process step, contrast, or relationship.
- Backs must be one atomic sentence or 1 to 3 bullet points.
- In bullet mode, every line must start with "- ".
- In bullet mode, each bullet must contain one precise, directly testable point.
- Do not repeat, restate, or paraphrase the front in the back.
- Do not include extra context, examples, caveats, or details beyond the source material.
- Avoid trivial or obvious information.
- Output as many cards as the material warrants, but prefer fewer high-value cards over many weak cards.
- ${MATH_RULE}

Good patterns:
Front: Functional dependency
Back:
- Relation where X determines Y
- For every specific X, Y is fixed

Front: Program counter
Back:
- Memory address of the next instruction to execute
- Updated after each instruction cycle

Front: DNS acronym
Back:
Domain Name System.

Bad patterns:
Front: What is a functional dependency?
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
Fronts are intentionally written as terse noun-phrase cues, not full sentences. This is correct style — do not flag it as confusing.
- "Functional dependency" is correct. Do not require "What is a functional dependency?".
- "DNS acronym" is correct. Do not flag as vague.
- "Mitochondria role" is correct. Do not flag as incomplete.
- "TCP vs UDP" is correct. Do not flag as ambiguous.
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
- Keep explanations under ${AI_LIMITS.maxValidationExplanationLength} characters, in English, specific and actionable.
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
  Front: "Velocity in terms of story points"
  Back: "- Total story points delivered per sprint"
- The new card must still be atomic: one retrieval cue, one coherent recall target
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
- The front must be one concise retrieval cue.
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

export type FlashcardMergeSynthesisOutput = z.infer<
  typeof flashcardMergeSynthesisOutputSchema
>;

export interface FlashcardForMergeSynthesis {
  id: string;
  front: string;
  back: string;
  deckName: string;
}

export function buildMergeSynthesisPrompt(input: {
  primary: FlashcardForMergeSynthesis;
  candidates: FlashcardForMergeSynthesis[];
}): string {
  const formatCard = (card: FlashcardForMergeSynthesis, label: string) =>
    `${label} (ID: ${card.id})
Deck: ${card.deckName}
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

export function buildGenerateFlashcardBackPrompt(input: {
  subjectName?: string;
  deckName?: string;
  front: string;
}): string {
  return [
    ...(input.subjectName ? [`Subject context: ${input.subjectName}`] : []),
    ...(input.deckName ? [`Deck context: ${input.deckName}`] : []),
    "Task: Write the back of a study flashcard for the front below.",
    input.subjectName
      ? "Use the subject only as background context. Answer only what the front asks."
      : "Answer only what the front asks.",
    `Front: ${input.front}`,
  ].join("\n");
}

export function buildImproveFlashcardBackPrompt(input: {
  subjectName?: string;
  deckName?: string;
  front: string;
  currentBack: string;
}): string {
  return [
    ...(input.subjectName ? [`Subject context: ${input.subjectName}`] : []),
    ...(input.deckName ? [`Deck context: ${input.deckName}`] : []),
    `Front: ${input.front}`,
    `Current back: ${input.currentBack}`,
    "",
    `Important: The back may contain image placeholders like {{IMAGE_0}}, {{IMAGE_1}}, etc. Treat these as opaque tokens that MUST appear in your output exactly as-is. Do not remove, rename, or modify them.`,
  ].join("\n");
}

export function buildGenerateFlashcardsPrompt(input: {
  subjectName?: string;
  deckName?: string;
  noteTitle?: string;
  text: string;
}): string {
  return [
    ...(input.subjectName ? [`Subject: ${input.subjectName}`] : []),
    ...(input.deckName ? [`Deck: ${input.deckName}`] : []),
    ...(input.noteTitle ? [`Note title: ${input.noteTitle}`] : []),
    "",
    "Source material:",
    input.text,
    "",
    "Create flashcards from this material.",
  ].join("\n");
}

export interface FlashcardForValidation {
  id: string;
  front: string;
  back: string;
  deckName: string;
}

export function buildValidateFlashcardsPrompt(
  flashcards: FlashcardForValidation[],
): string {
  const cards = flashcards
    .map(
      (card, index) =>
        `Card ${index + 1} (ID: ${card.id})
Deck: ${card.deckName}
Front: ${card.front}
Back: ${card.back}`,
    )
    .join("\n\n");

  return `Analyze the following flashcards and report any issues:\n\n${cards}`;
}

export function normalizeGeneratedCards(
  output: z.infer<typeof generatedFlashcardsSchema>,
): Array<{ front: string; back: string }> | null {
  const cards: Array<{ front: string; back: string }> = [];

  for (const card of output.cards) {
    const front = card.front.trim();
    const back = card.back.trim();

    if (front.length === 0 || back.length === 0) {
      continue;
    }

    const normalizedBack = normalizeGeneratedBack(back);
    const normalizedBackLines = normalizedBack.split("\n");
    const hasBulletLines = normalizedBackLines.some((line) =>
      /^[-*]\s+/.test(line.trim()),
    );
    const firstLine = normalizedBackLines[0]?.trim() ?? "";
    const backWithConsistentBullets =
      hasBulletLines && firstLine.length > 0 && !/^[-*]\s+/.test(firstLine)
        ? `- ${firstLine}\n${normalizedBackLines.slice(1).join("\n")}`
        : normalizedBack;

    cards.push({
      front: plainTextToRichText(front),
      back: plainTextToRichText(backWithConsistentBullets),
    });
  }

  if (cards.length > LIMITS.flashcardAiMaxOutput) {
    return null;
  }

  return cards;
}
