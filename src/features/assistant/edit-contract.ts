import { z } from "zod";
import { editToolInputObject } from "@/features/assistant/edit-guards";
import { EDITOR_MARKDOWN_RULE } from "@/lib/ai/prompt-rules";
import { FOLDER_PATH_MAX_CHARS, LIMITS } from "@/lib/config/limits";
import { documentText, type RichTextDocument } from "@/lib/editor/document";
import { documentFromMarkdown } from "@/lib/editor/document-markdown";

/** Raw size cap for a card side sent to the assistant; the visible-text limit
 * is checked separately, as saved cards count it. Markdown needs room for
 * tables and syntax. */
export const ASSISTANT_CARD_SIDE_MAX_CHARS = 100_000;
const draftMarkdown = (limit: number) =>
  z
    .string()
    .max(ASSISTANT_CARD_SIDE_MAX_CHARS)
    .refine(
      (value) => documentText(documentFromMarkdown(value)).length <= limit,
      `Expected rich text with at most ${limit} visible characters`,
    );

/** Current unsaved editor content; empty fields and folder are allowed.
 * @example flashcardDraftSchema.parse({ sessionId: "draft-1", revision: 0, front: "", back: "" });
 */
export const flashcardDraftSchema = z.object({
  sessionId: z.string().min(1).max(100),
  revision: z.number().int().nonnegative(),
  front: draftMarkdown(LIMITS.flashcardFrontMax),
  back: draftMarkdown(LIMITS.flashcardBackMax),
  folderPath: z.string().max(FOLDER_PATH_MAX_CHARS).optional(),
});

/** Model replacements use Markdown, with images represented by placeholders.
 * @example flashcardEditsInputSchema.parse({ sessionId: "d", revision: 0, front: "Why?" });
 */
export const flashcardEditsInputSchema = editToolInputObject(
  {
    sessionId: z
      .string()
      .min(1)
      .max(100)
      .describe(
        "Copy sessionId exactly from the current flashcard draft, never history.",
      ),
    revision: z
      .number()
      .int()
      .nonnegative()
      .describe("Copy revision exactly from the current flashcard draft."),
    front: draftMarkdown(LIMITS.flashcardFrontMax)
      .optional()
      .describe("Full replacement front in Markdown; omit to keep unchanged."),
    back: draftMarkdown(LIMITS.flashcardBackMax)
      .optional()
      .describe(
        "Full replacement back in Markdown; omit to keep unchanged. Use - bullets or 1. ordered steps; indent a block equation under the bullet it belongs to.",
      ),
  },
  "",
)
  .refine((value) => value.front !== undefined || value.back !== undefined, {
    message: "Expected a front or back replacement",
  })
  .describe(
    `Replace only requested fields; preserve unrelated content, formatting, and every image placeholder exactly. Never invent image URLs. ${EDITOR_MARKDOWN_RULE}`,
  );

const editOutcome = z.enum(["accepted", "discarded", "skipped", "stale"]);
export const flashcardEditsOutputSchema = z.object({
  front: editOutcome.optional(),
  back: editOutcome.optional(),
});

export type FlashcardDraft = z.infer<typeof flashcardDraftSchema>;
export type FlashcardEditsInput = z.infer<typeof flashcardEditsInputSchema>;
export type FlashcardEditsOutput = z.infer<typeof flashcardEditsOutputSchema>;
export type FlashcardEditField = "front" | "back";

export type NativeFlashcardDraft = Omit<FlashcardDraft, "front" | "back"> & {
  front: RichTextDocument;
  back: RichTextDocument;
};
