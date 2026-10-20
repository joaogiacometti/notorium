import { type InferUITools, tool } from "ai";
import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";

// Subject paths join up to `maxSubjectNestingDepth` names with "::".
const SUBJECT_PATH_MAX_CHARS =
  LIMITS.maxSubjectNestingDepth * (LIMITS.subjectNameMax + 2);

/** Most cards one proposal may hold; keeps a single turn reviewable. */
export const FLASHCARD_PROPOSAL_MAX_CARDS = 5;

const EXAMPLE_LANGUAGE_MAX_CHARS = 30;

/**
 * A code example kept apart from the back so the chat can show it in its own
 * section and the app, not the model, decides how it is appended to the card.
 *
 * @example
 * flashcardExampleSchema.parse({ language: "sql", code: "SELECT 1;" });
 */
export const flashcardExampleSchema = z.object({
  language: z
    .string()
    .trim()
    .max(EXAMPLE_LANGUAGE_MAX_CHARS)
    .describe("Fence language tag such as prolog, python, sql, or cpp."),
  code: z
    .string()
    .trim()
    .min(1)
    .max(LIMITS.flashcardBackMax)
    .describe(
      "Definitions or data first, a blank line, then the call or query with its result as a comment.",
    ),
});

/**
 * One model-written card: plain text with the assistant's list, code fence,
 * and LaTeX conventions, converted to rich text only when the user creates it.
 * The optional code `example` is appended to the back on create, so the two
 * together must fit the back limit.
 *
 * @example
 * proposedFlashcardSchema.parse({ front: "What is ATP?", back: "The cell's energy carrier." });
 */
export const proposedFlashcardSchema = z
  .object({
    front: z.string().trim().min(1).max(LIMITS.flashcardFrontMax),
    back: z.string().trim().min(1).max(LIMITS.flashcardBackMax),
    example: flashcardExampleSchema
      .optional()
      .describe("Only when the user asks for examples."),
    subjectPath: z.string().trim().max(SUBJECT_PATH_MAX_CHARS).optional(),
  })
  .superRefine((card, ctx) => {
    const length = card.back.length + (card.example?.code.length ?? 0);
    if (length > LIMITS.flashcardBackMax) {
      ctx.addIssue({
        code: "custom",
        path: ["example"],
        message: `Back plus example is ${length} characters; expected at most ${LIMITS.flashcardBackMax}.`,
      });
    }
  });

// All cards travel in one call: many models make only one tool call per
// reply, and a call without `execute` ends the reply.
export const flashcardProposalInputSchema = z.object({
  cards: z
    .array(proposedFlashcardSchema)
    .min(1)
    .max(FLASHCARD_PROPOSAL_MAX_CARDS),
});

/**
 * What the user did with each proposed card, in card order; sent back to the
 * model with the next turn. "skipped" means the user sent another message
 * without deciding, so the card was not saved.
 *
 * @example
 * flashcardProposalOutputSchema.parse({ outcomes: ["created", "dismissed"] });
 */
export const flashcardProposalOutputSchema = z.object({
  outcomes: z
    .array(z.enum(["created", "dismissed", "skipped"]))
    .min(1)
    .max(FLASHCARD_PROPOSAL_MAX_CARDS),
});

export type ProposedFlashcard = z.infer<typeof proposedFlashcardSchema>;
export type FlashcardExample = z.infer<typeof flashcardExampleSchema>;
export type FlashcardProposalOutcome = z.infer<
  typeof flashcardProposalOutputSchema
>["outcomes"][number];
export type FlashcardProposalOutput = z.infer<
  typeof flashcardProposalOutputSchema
>;

/**
 * Study assistant tools. `proposeFlashcards` has no `execute`: the call ends
 * the reply and the chat shows the cards for the user to create, edit, or
 * discard, so nothing is written without the user's click and the route stays
 * write-free.
 *
 * @example
 * streamChatResponse({ ...options, tools: assistantTools });
 */
export const assistantTools = {
  proposeFlashcards: tool({
    description: `Propose 1 to ${FLASHCARD_PROPOSAL_MAX_CARDS} flashcards in a single call for the user to review. Put code examples in the example field, never in back. Nothing is saved until the user confirms each card in the chat.`,
    inputSchema: flashcardProposalInputSchema,
    outputSchema: flashcardProposalOutputSchema,
  }),
};

export type AssistantTools = InferUITools<typeof assistantTools>;
