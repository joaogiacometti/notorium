import { z } from "zod";

/**
 * A question with clickable answers. The question is required here, so choices
 * can never appear without one, and there is deliberately no answer key.
 * @example answerChoicesSchema.parse({ question: "2 + 2?", options: ["4", "5"] });
 */
export const answerChoicesSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .describe("The one question the options answer."),
    options: z
      .array(z.string().trim().min(1).max(300))
      .min(2)
      .max(4)
      .describe(
        "Two to four distinct plausible answers or ways to proceed, without letter prefixes or marking the correct answer. Do not reveal the solution before the user attempts it.",
      ),
  })
  .refine(({ options }) => new Set(options).size === options.length, {
    message: "Repeated options; expected distinct answer choices",
  });
