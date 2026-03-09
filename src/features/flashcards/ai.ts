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
Do not add filler, explanations about the answer, disclaimers, examples, or study tips.
Default to one short, direct answer sentence.
Use a short bullet list only when the front explicitly asks for stages, steps, phases, parts, or a workflow.
Keep the answer narrow and atomic.
If the front is broad, ambiguous, or asks for too much, answer only the most central directly testable fact.
Do not invent extra context beyond what is needed to answer the front.
Prefer concrete wording over general wording.
Match the language of the front.
Do not use markdown fences.

Good patterns:
Front: What is a CPU?
Back: The CPU (Central Processing Unit) executes program instructions and performs calculations.

Front: What does the Program Counter store?
Back: The memory address of the next instruction to execute.

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
Back: RAM is a type of memory used in computers and phones and many devices to temporarily hold information while programs are running, and it is very important for performance.
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
  return value
    .replaceAll("\r\n", "\n")
    .replace(/^(Back:|Answer:)\s*/i, "")
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
