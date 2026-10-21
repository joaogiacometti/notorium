import { z } from "zod";
import { MATH_RULE } from "@/lib/ai/prompt-rules";
import { LIMITS } from "@/lib/config/limits";

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
