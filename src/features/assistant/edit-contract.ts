import { z } from "zod";
import { LIMITS, SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";
import { richTextToPlainText } from "@/lib/editor/rich-text";

/** Raw size cap for a card side sent to the assistant; the visible-text limit
 * is checked separately. HTML needs room for tables, math attributes, and
 * attachment references. */
export const ASSISTANT_CARD_SIDE_MAX_CHARS = 100_000;
const draftHtml = (limit: number) =>
  z
    .string()
    .max(ASSISTANT_CARD_SIDE_MAX_CHARS)
    .refine(
      (value) => richTextToPlainText(value).length <= limit,
      `Expected rich text with at most ${limit} visible characters`,
    );

/** Current unsaved editor content; empty fields and subject are allowed.
 * @example flashcardDraftSchema.parse({ sessionId: "draft-1", revision: 0, front: "", back: "" });
 */
export const flashcardDraftSchema = z.object({
  sessionId: z.string().min(1).max(100),
  revision: z.number().int().nonnegative(),
  front: draftHtml(LIMITS.flashcardFrontMax),
  back: draftHtml(LIMITS.flashcardBackMax),
  subjectPath: z.string().max(SUBJECT_PATH_MAX_CHARS).optional(),
});

/** Model replacements use supported editor HTML, with images represented by placeholders.
 * @example flashcardEditsInputSchema.parse({ sessionId: "d", revision: 0, front: "<p>Why?</p>" });
 */
export const flashcardEditsInputSchema = z
  .object({
    sessionId: z.string().min(1).max(100),
    revision: z.number().int().nonnegative(),
    front: draftHtml(LIMITS.flashcardFrontMax).optional(),
    back: draftHtml(LIMITS.flashcardBackMax).optional(),
  })
  .refine((value) => value.front !== undefined || value.back !== undefined, {
    message: "Expected a front or back replacement",
  });

const editOutcome = z.enum(["accepted", "discarded", "skipped", "stale"]);
export const flashcardEditsOutputSchema = z.object({
  front: editOutcome.optional(),
  back: editOutcome.optional(),
});

export type FlashcardDraft = z.infer<typeof flashcardDraftSchema>;
export type FlashcardEditsInput = z.infer<typeof flashcardEditsInputSchema>;
export type FlashcardEditsOutput = z.infer<typeof flashcardEditsOutputSchema>;
export type FlashcardEditField = "front" | "back";
