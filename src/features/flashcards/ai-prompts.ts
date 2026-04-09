import { z } from "zod";
import { normalizeGeneratedBack } from "@/features/flashcards/ai-utils";
import { AI_LIMITS, LIMITS } from "@/lib/config/limits";

const LANGUAGE_RULE =
  "Output language: English only. Regardless of the source material or card language, all generated text must be in English.";

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
Do not repeat, restate, or paraphrase the front.
Do not use labels such as Front or Back.
Output must be plain text only.
If the answer is a single atomic fact, output one concise sentence only.
Otherwise output a list with 3 to 5 lines.
In list mode, every line must start with "- ".
In list mode, each line must contain one directly testable point.
In list mode, do not write any text before or after the list.
In list mode, do not use inline separators like " - " inside a line.
In list mode, do not use numbering.
Do not add filler, disclaimers, study tips, or long explanations.
Do not start with generic definition wrappers such as "An approach where...", "A method that...", or "It is...".
Do not use labels or wrappers such as "Back:", "Answer:", "Summary:", "Definition:", or "Key points:".
In list mode, you may include at most one final bullet starting with "- Example:" only for procedural or pattern-based concepts where a concrete instance aids recall. Do not use it for definitions, facts, or concepts that are self-explanatory.
Do not use bullets starting with "E.g." or "Ex.".
Keep the answer narrow and atomic.
If the front is broad, ambiguous, or asks for too much, answer only the most central directly testable fact — the one a student would most likely be tested on.
Do not invent extra context beyond what is needed to answer the front.
Prefer concrete wording over general wording.
Do not use markdown fences.

Good patterns:
Front: What does DNS stand for?
Back:
Domain Name System.

Front: What is DNS?
Back:
- Maps domain names to IP addresses through hierarchical name resolution
- Uses recursive resolvers to query authoritative name servers
- Caches records to reduce latency and external lookups
- Supports multiple record types such as A, AAAA, CNAME, and MX
- Example: Looking up example.com returns its current IP address

Front: What is a CPU?
Back:
- Executes program instructions
- Performs arithmetic and logic operations
- Coordinates data flow between components

Front: What is the Program Counter?
Back:
- Memory address of the next instruction to execute
- Updated after each instruction cycle
- Used by control flow operations

Front: What are the main stages of program execution?
Back:
- Write program
- Compile or assemble to machine code
- Load into memory
- Execute instructions

Front: Explain how TCP/IP works.
Back:
- Splits data into packets at the sender
- Routes packets independently across networks
- Reassembles packets in order at the receiver
- Retransmits lost packets to guarantee delivery

Subject context is allowed only as background context.
Use the subject only as background context. Answer only what the front asks.

Bad patterns:
Front: What does DNS stand for?
Back:
- Domain Name System
- Resolves IP addresses
- Has recursive and authoritative servers

Front: What is DNS?
Back:
It is a system on the internet that helps with names and addresses and many other things in different situations.

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
- Always rewrite the content. If the original is a list of fragments, convert to a proper structured list with complete, testable points.
- If the original is already well-structured, improve precision, remove redundancy, and sharpen each point.
- If the answer is a single atomic fact, output one concise sentence only.
- Otherwise output a list with 3 to 5 lines.
- In list mode, every line must start with "- ".
- In list mode, each line must be one complete, directly testable point.
- In list mode, do not write any text before or after the list.
- In list mode, do not use inline separators like " - " inside a line.
- In list mode, do not use numbering.
- Do not use HTML tags. Output plain text only.
- Do not repeat, restate, or paraphrase the front.
- Do not start with generic definition wrappers such as "An approach where...", "A method that...", or "It is...".
- Do not use labels or wrappers such as "Back:", "Answer:", "Summary:", "Definition:", "Key points:", or "Improved:".
- Do not add filler, disclaimers, study tips, or long explanations.
- Do not invent facts not implied by the original back.

Subject context is allowed only as background context.

Good improvements:
Front: What does DNS stand for?
Current back: Domain Name System.
Improved:
Domain Name System.

Front: What is a CPU?
Current back: The central processing unit is the brain of the computer that executes instructions.
Improved:
- Executes program instructions
- Performs arithmetic and logic operations
- Coordinates data flow between components

Bad improvements:
Front: What does DNS stand for?
Current back: Domain Name System.
Improved: Here is a detailed explanation of DNS which is a very important system.

Front: What is DNS?
Current back: Resolves domain names to IP addresses.
Improved: DNS is a complex distributed system that has many components and works in many different ways.
`;

export const flashcardsGenerationSystemPrompt = `${LANGUAGE_RULE}

You are creating study flashcards from source material.

Extract key concepts and create atomic, testable flashcard pairs.

Rules:
- Each card must have one clear, testable question on the front
- Each answer must be concise (1-5 bullet points or one sentence)
- Focus on facts, definitions, processes, and relationships
- Avoid creating cards for trivial or obvious information
- Do not repeat context across cards unnecessarily
- Output as many cards as the material warrants

Output format: JSON object with a "cards" array containing { front, back } objects.`;

export const flashcardValidationSystemPrompt = `${LANGUAGE_RULE}

You are a flashcard quality validator. Analyze flashcards for three types of issues:

1. **Incorrect**: The back contains factual errors or wrong answers to the front.
2. **Confusing**: The front or back is genuinely ambiguous, too broad, or so unclear it cannot be studied effectively.
3. **Duplicate**: Two cards test exactly the same knowledge — both the question and the answer are effectively equivalent.

FRONT STYLE AWARENESS
Fronts are intentionally written as terse noun-phrase cues, not full sentences. This is correct style — do not flag it as confusing.
- "DNS acronym" is correct. Do not flag as vague.
- "Mitochondria role" is correct. Do not flag as incomplete.
- "TCP vs UDP" is correct. Do not flag as ambiguous.
Only flag a front as confusing if the cue is so unclear that a student genuinely cannot know what to recall.

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

export function buildGenerateFlashcardBackPrompt(input: {
  subjectName: string;
  deckName?: string | null;
  front: string;
}): string {
  const deckContext =
    input.deckName && input.deckName.trim().length > 0
      ? [`Deck context: ${input.deckName}`]
      : [];

  return [
    `Subject context: ${input.subjectName}`,
    ...deckContext,
    "Task: Write the back of a study flashcard for the front below.",
    "Use the subject only as background context. Answer only what the front asks.",
    `Front: ${input.front}`,
  ].join("\n");
}

export function buildImproveFlashcardBackPrompt(input: {
  subjectName: string;
  deckName?: string | null;
  front: string;
  currentBack: string;
}): string {
  const deckContext =
    input.deckName && input.deckName.trim().length > 0
      ? [`Deck context: ${input.deckName}`]
      : [];

  return [
    `Subject context: ${input.subjectName}`,
    ...deckContext,
    `Front: ${input.front}`,
    `Current back: ${input.currentBack}`,
    "",
    `Important: The back may contain image placeholders like {{IMAGE_0}}, {{IMAGE_1}}, etc. Treat these as opaque tokens that MUST appear in your output exactly as-is. Do not remove, rename, or modify them.`,
  ].join("\n");
}

export function buildGenerateFlashcardsPrompt(input: {
  subjectName: string;
  deckName?: string | null;
  text: string;
}): string {
  const deckContext =
    input.deckName && input.deckName.trim().length > 0
      ? [`Deck: ${input.deckName}`]
      : [];

  return [
    `Subject: ${input.subjectName}`,
    ...deckContext,
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
  subjectName: string;
}

export function buildValidateFlashcardsPrompt(
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
      front,
      back: backWithConsistentBullets,
    });
  }

  if (cards.length > LIMITS.flashcardAiMaxOutput) {
    return null;
  }

  return cards;
}
