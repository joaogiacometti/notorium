import { z } from "zod";
import type { ResolvedUserAiSettings } from "@/features/ai/settings";
import { flashcardBackSchema } from "@/features/flashcards/validation";
import { generateStructuredOutput } from "@/lib/ai/generate-structured";
import { richTextToPlainText } from "@/lib/editor/rich-text";

const generatedFlashcardBackSchema = z.object({
  backText: z.string().trim().min(1).max(400),
});

export const flashcardBackSystemPrompt = `Write only the back of the flashcard.
Be assertive, precise, and minimal.
Do not repeat, restate, or paraphrase the front.
Do not use labels such as Front or Back.
Default to concise bullet points.
Write 3 to 5 short bullets maximum.
Each bullet must contain one directly testable point.
Do not add filler, disclaimers, study tips, or long explanations.
Do not start with generic definition wrappers such as "An approach where...", "A method that...", or "It is...".
Use at most one bullet starting with "E.g." only when it improves recall.
If the card is a very atomic fact, one short sentence is allowed.
Keep the answer narrow and atomic.
If the front is broad, ambiguous, or asks for too much, answer only the most central directly testable fact.
Do not invent extra context beyond what is needed to answer the front.
Prefer concrete wording over general wording.
Match the language of the front.
Do not use markdown fences.

Good patterns:
Front: What is a CPU?
Back:
- Executes program instructions
- Performs arithmetic and logic operations
- Coordinates data flow between components
- E.g. Runs instruction cycles such as fetch and execute

Front: What does the Program Counter store?
Back:
- Memory address of the next instruction to execute

Front: What are the main stages of program execution?
Back:
- Write program
- Compile or assemble to machine code
- Load into memory
- Execute instructions

Subject context is allowed only as background context.
Use the subject only as background context. Answer only what the front asks.

Bad patterns:
Front: Explain how a CPU works.
Back: Large paragraph covering many concepts.

Front: What is RAM?
Back: An architecture approach where a system temporarily stores data used by running programs.
`;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeLine(value: string) {
  return value.replaceAll(/\s+/g, " ").trim();
}

export function normalizeGeneratedBack(value: string) {
  const normalized = value.replaceAll("\r\n", "\n").trim();

  const withoutLabels = normalized.replace(
    /^(Back:|Answer:|Definition:|Response:)\s*/i,
    "",
  );

  return withoutLabels
    .replace(
      /^(Here (?:are|is)\s+(?:the\s+)?(?:key\s+)?(?:points?|answer)|Key points?|Summary|Definition)\s*:\s*\n(?=(?:[-*]\s+|\d+\.\s+))/i,
      "",
    )
    .trim();
}

export function plainTextToRichText(value: string) {
  const blocks = value
    .replaceAll("\r\n", "\n")
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  if (blocks.length === 0) {
    return "";
  }

  return blocks
    .map((block) => {
      const lines = block
        .split("\n")
        .map(normalizeLine)
        .filter((line) => line.length > 0);

      if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines
          .map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }

      if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
        return `<ol>${lines
          .map(
            (line) => `<li>${escapeHtml(line.replace(/^\d+\.\s+/, ""))}</li>`,
          )
          .join("")}</ol>`;
      }

      return `<p>${escapeHtml(lines.join(" "))}</p>`;
    })
    .join("");
}

export function buildGenerateFlashcardBackPrompt(input: {
  subjectName: string;
  front: string;
}) {
  return [
    `Subject context: ${input.subjectName}`,
    "Task: Write the back of a study flashcard for the front below.",
    "Use the subject only as background context. Answer only what the front asks.",
    `Front: ${input.front}`,
  ].join("\n");
}

export async function generateFlashcardBackContent(input: {
  settings: ResolvedUserAiSettings;
  subjectName: string;
  front: string;
}) {
  const frontText = normalizeLine(richTextToPlainText(input.front));

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardBackSchema,
    system: flashcardBackSystemPrompt,
    prompt: buildGenerateFlashcardBackPrompt({
      subjectName: input.subjectName,
      front: frontText,
    }),
    maxOutputTokens: 250,
  });

  const back = plainTextToRichText(normalizeGeneratedBack(output.backText));
  const parsedBack = flashcardBackSchema.safeParse(back);

  if (!parsedBack.success) {
    throw new Error("Invalid flashcard back generated");
  }

  return parsedBack.data;
}
