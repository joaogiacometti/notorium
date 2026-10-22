import { type InferUITools, tool } from "ai";
import { z } from "zod";
import {
  documentEditsOutputSchema,
  mindmapEditsInputSchema,
  noteEditsInputSchema,
} from "@/features/assistant/document-edit-contract";
import {
  flashcardEditsInputSchema,
  flashcardEditsOutputSchema,
} from "@/features/assistant/edit-contract";
import {
  formatLibraryHitsForModel,
  type LibrarySearchInput,
  type LibrarySearchOutput,
  librarySearchInputSchema,
  librarySearchOutputSchema,
} from "@/features/assistant/library-search-contract";
import { LIMITS, SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";

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

/** Runs one `searchLibrary` call for the current user; injected by the service. */
export type LibrarySearchFunction = (
  input: LibrarySearchInput,
) => Promise<LibrarySearchOutput>;

/**
 * Study assistant tools. The proposal tools have no `execute`: the call ends
 * the reply and the chat shows the cards or edits for the user to accept, so
 * nothing is written without the user's click and the route stays write-free.
 * `searchLibrary` is the one tool run on the server: it only reads, through
 * the injected user-bound search.
 *
 * @example
 * streamChatResponse({ ...options, tools: buildAssistantTools(search) });
 */
export function buildAssistantTools(searchLibrary: LibrarySearchFunction) {
  return {
    proposeNoteEdits: tool({
      description:
        "Propose targeted block edits or a title change ONLY when explicitly asked to modify the CURRENT note draft. Refer only to visible block ids. Empty replacement HTML deletes a range. Nothing changes until the user applies the proposal.",
      inputSchema: noteEditsInputSchema,
      outputSchema: documentEditsOutputSchema,
    }),
    proposeMindmapEdits: tool({
      description:
        "Propose branch, style (color/bold/italic), or cross-connection operations ONLY when explicitly asked to modify the CURRENT mindmap draft. Refer only to visible ids or earlier new-node aliases. Nothing changes until the user applies the proposal.",
      inputSchema: mindmapEditsInputSchema,
      outputSchema: documentEditsOutputSchema,
    }),
    proposeFlashcardEdits: tool({
      description:
        "Suggest front/back replacements ONLY when the current user message explicitly requests changes to the flashcard draft. Never use this tool to answer questions, explain concepts, or give examples in chat, even when a draft is present. The user reviews changes in the editor; nothing is saved.",
      inputSchema: flashcardEditsInputSchema,
      outputSchema: flashcardEditsOutputSchema,
    }),
    proposeFlashcards: tool({
      description: `Propose 1 to ${FLASHCARD_PROPOSAL_MAX_CARDS} flashcards for the user to review; nothing is saved until they confirm each card.`,
      inputSchema: flashcardProposalInputSchema,
      outputSchema: flashcardProposalOutputSchema,
    }),
    searchLibrary: tool({
      description:
        "Search the user's own notes, flashcards, and mindmaps by keyword. Use ONLY when the user asks whether they have material on something or where they wrote about it. Returns a few short excerpts, which the chat shows as links.",
      inputSchema: librarySearchInputSchema,
      outputSchema: librarySearchOutputSchema,
      execute: (input) => searchLibrary(input),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: formatLibraryHitsForModel(output),
      }),
    }),
  };
}

export type AssistantTools = InferUITools<
  ReturnType<typeof buildAssistantTools>
>;
