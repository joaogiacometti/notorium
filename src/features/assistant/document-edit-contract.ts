import { z } from "zod";
import { editToolInputObject } from "@/features/assistant/edit-guards";
import { STUDY_CONTEXT_MAX_CHARS } from "@/features/assistant/study-context";
import { EDITOR_HTML_MATH_RULE } from "@/lib/ai/prompt-rules";
import { LIMITS, SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";

const reference = z.string().min(1).max(100);
const sessionFields = {
  sessionId: reference.describe(
    "Copy sessionId exactly from the current document draft, never history.",
  ),
  revision: z
    .number()
    .int()
    .nonnegative()
    .describe("Copy revision exactly from the current document draft."),
};
const title = z.string().trim().min(1).max(LIMITS.noteTitleMax);
const draftFields = {
  ...sessionFields,
  title: z.string().max(200),
  partial: z.boolean(),
  subjectPath: z.string().max(SUBJECT_PATH_MAX_CHARS).optional(),
};

export const noteBlockSchema = z.object({
  id: reference,
  html: z.string().max(STUDY_CONTEXT_MAX_CHARS),
});
export const documentDraftSchema = z
  .object({
    kind: z.literal("note"),
    ...draftFields,
    blocks: z.array(noteBlockSchema).max(1000),
  })
  .refine(
    (draft) => JSON.stringify(draft.blocks).length <= STUDY_CONTEXT_MAX_CHARS,
    { message: "Expected document context within 12000 characters" },
  );

// Tool input schemas stay flat: no unions, `const`, or nullable fields. Gemini
// function calling accepts only an OpenAPI subset without `oneOf`/`const`, so a
// discriminated union reaches it without per-kind fields and its first call
// fails validation. Each operation kind is its own optional array instead.
const DOCUMENT_EDITS_MAX = 30;
const editList = <T extends z.ZodType>(item: T) =>
  z.array(item).max(DOCUMENT_EDITS_MAX).optional();
function countEdits(lists: (unknown[] | undefined)[]): number {
  return lists.reduce((total, list) => total + (list?.length ?? 0), 0);
}

// Block ids exist only in one captured editor revision; they never enter stored HTML.
export const noteEditsInputSchema = editToolInputObject(
  {
    ...sessionFields,
    title: title.optional(),
    replacements: editList(
      z.object({
        firstBlockId: reference.describe(
          "First visible block id in the contiguous range to replace.",
        ),
        lastBlockId: reference.describe(
          "Last visible block id, inclusive. All blocks in the range must be visible.",
        ),
        html: z
          .string()
          .max(LIMITS.assistantReplyMaxChars)
          .describe(
            `Replacement supported editor HTML; empty deletes the range. Preserve unrelated formatting, math, tables, and all image placeholders; never invent attachments. ${EDITOR_HTML_MATH_RULE}`,
          ),
      }),
    ),
    insertions: editList(
      z.object({
        // Omitted only when the note is empty.
        anchorBlockId: reference
          .optional()
          .describe(
            "Visible block to insert beside; omit only for an empty note.",
          ),
        side: z.enum(["before", "after"]),
        html: z
          .string()
          .min(1)
          .max(LIMITS.assistantReplyMaxChars)
          .describe(
            `Inserted editor HTML with paragraphs, headings, lists, strong/em, pre/code, or tables. ${EDITOR_HTML_MATH_RULE} Preserve image placeholders exactly.`,
          ),
      }),
    ),
  },
  ", with each edit inside replacements or insertions",
)
  .refine(
    (input) =>
      input.title !== undefined ||
      countEdits([input.replacements, input.insertions]) > 0,
    { message: "Expected a title, replacement, or insertion" },
  )
  .refine(
    (input) =>
      countEdits([input.replacements, input.insertions]) <= DOCUMENT_EDITS_MAX,
    { message: `Expected at most ${DOCUMENT_EDITS_MAX} block edits` },
  );

export const documentEditsOutputSchema = z.object({
  outcome: z.enum(["accepted", "discarded", "skipped", "stale"]),
});

export type DocumentDraft = z.infer<typeof documentDraftSchema>;
export type NoteDraft = Extract<DocumentDraft, { kind: "note" }>;
export type NoteEditsInput = z.infer<typeof noteEditsInputSchema>;
export type DocumentEditOutcome = z.infer<
  typeof documentEditsOutputSchema
>["outcome"];
