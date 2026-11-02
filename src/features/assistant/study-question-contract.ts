import { z } from "zod";

/** A question with visible choices, never an embedded answer key. */
export const studyQuestionSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .describe(
        "One application question in the user's language. Use dollar-delimited LaTeX for math.",
      ),
    options: z
      .array(z.string().trim().min(1).max(300))
      .min(2)
      .max(4)
      .describe(
        "Two to four distinct plausible answers, without letter prefixes or marking the correct answer. Do not reveal the solution before the user attempts it.",
      ),
  })
  .refine(({ options }) => new Set(options).size === options.length, {
    message: "Repeated options; expected distinct answer choices",
  });

interface QuestionTurn {
  role: string;
  metadata?: { studyAnswer?: boolean };
  parts: ReadonlyArray<{
    type: string;
    text?: string;
    state?: string;
    output?: unknown;
  }>;
}

/** Answer clicks cannot authorize lesson exit. Recognize older clients' choices too. */
export function isStudyAnswerTurn(
  messages: ReadonlyArray<QuestionTurn>,
): boolean {
  const latest = messages.at(-1);
  if (latest?.role !== "user") return false;
  if (latest.metadata?.studyAnswer) return true;
  const previous = messages.at(-2);
  if (previous?.role !== "assistant") return false;
  const text = normalizeAnswer(
    latest.parts
      .flatMap((part) => (part.type === "text" ? [part.text ?? ""] : []))
      .join("\n"),
  );
  for (const part of previous.parts) {
    if (
      part.type !== "tool-askStudyQuestion" ||
      part.state !== "output-available"
    )
      continue;
    const question = studyQuestionSchema.safeParse(part.output);
    if (!question.success) continue;
    if (
      question.data.options.some((option, index) => {
        const label = String.fromCharCode(65 + index).toLowerCase();
        return [
          label,
          `${label})`,
          `${label}.`,
          normalizeAnswer(option),
          `${label}) ${normalizeAnswer(option)}`,
        ].includes(text);
      })
    )
      return true;
  }
  return false;
}

function normalizeAnswer(text: string): string {
  return text.replaceAll("$", "").replaceAll(/\s+/g, " ").trim().toLowerCase();
}
