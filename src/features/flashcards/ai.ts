import { z } from "zod";
import type { ResolvedUserAiSettings } from "@/features/ai/settings";
import { flashcardBackSchema } from "@/features/flashcards/validation";
import { generateStructuredOutput } from "@/lib/ai/generate-structured";
import { richTextToPlainText } from "@/lib/editor/rich-text";

const MAX_BACK_TOKENS = 100;
const IMPROVE_MAX_TOKENS = 300;

const generatedFlashcardBackSchema = z.object({
  backText: z.string().trim().min(1).max(400),
});

export const flashcardBackSystemPrompt = `Write only the back of the flashcard.
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

export const flashcardBackImproveSystemPrompt = `You are rewriting a flashcard back to be significantly better. You MUST produce a different, improved version. Never echo the original back unchanged.

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

const LABEL_PREFIX_RE = /^(Back:|Answer:|Definition:|Response:)\s*/i;

const PROSE_HEADER_RE =
  /^(Here (?:are|is)\s+(?:the\s+)?(?:key\s+)?(?:points?|answer)|Key points?|Summary|Definition)\s*:\s*\n(?=(?:[-*]\s+|\d+\.\s+))/i;

const INLINE_BULLET_RE = /(?<!\n) - /g;

export function normalizeGeneratedBack(value: string): string {
  let normalized = value.replaceAll("\r\n", "\n").trim();

  let prev: string;
  do {
    prev = normalized;
    normalized = normalized.replace(LABEL_PREFIX_RE, "").trim();
  } while (normalized !== prev);

  normalized = normalized.replace(PROSE_HEADER_RE, "").trim();
  normalized = normalized.replace(INLINE_BULLET_RE, "\n- ");

  return normalized;
}

type BlockType = "bullet" | "ordered" | "paragraph";

function classifyLines(lines: string[]): BlockType {
  const isBullet = lines.every((line) => /^[-*]\s+/.test(line));
  if (isBullet) return "bullet";

  const isOrdered = lines.every((line) => /^\d+\.\s+/.test(line));
  if (isOrdered) return "ordered";

  return "paragraph";
}

export function plainTextToRichText(value: string): string {
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

      const type = classifyLines(lines);

      if (type === "bullet") {
        return `<ul>${lines
          .map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }

      if (type === "ordered") {
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
}): string {
  return [
    `Subject context: ${input.subjectName}`,
    "Task: Write the back of a study flashcard for the front below.",
    "Use the subject only as background context. Answer only what the front asks.",
    `Front: ${input.front}`,
  ].join("\n");
}

export function buildImproveFlashcardBackPrompt(input: {
  subjectName: string;
  front: string;
  currentBack: string;
}): string {
  return [
    `Subject context: ${input.subjectName}`,
    `Front: ${input.front}`,
    `Current back: ${input.currentBack}`,
  ].join("\n");
}

export async function generateFlashcardBackContent(input: {
  settings: ResolvedUserAiSettings;
  subjectName: string;
  front: string;
}): Promise<string> {
  const frontText = normalizeLine(richTextToPlainText(input.front));

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardBackSchema,
    system: flashcardBackSystemPrompt,
    prompt: buildGenerateFlashcardBackPrompt({
      subjectName: input.subjectName,
      front: frontText,
    }),
    maxOutputTokens: MAX_BACK_TOKENS,
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
  settings: ResolvedUserAiSettings;
  subjectName: string;
  front: string;
  currentBack: string;
}): Promise<string> {
  const frontText = normalizeLine(richTextToPlainText(input.front));
  const backText = normalizeLine(richTextToPlainText(input.currentBack));

  const output = await generateStructuredOutput({
    settings: input.settings,
    schema: generatedFlashcardBackSchema,
    system: flashcardBackImproveSystemPrompt,
    prompt: buildImproveFlashcardBackPrompt({
      subjectName: input.subjectName,
      front: frontText,
      currentBack: backText,
    }),
    maxOutputTokens: IMPROVE_MAX_TOKENS,
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
