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
  type EditGuard,
  guardEditSchema,
} from "@/features/assistant/edit-guards";
import { findFlashcardEditProblems } from "@/features/assistant/flashcard-edit-rules";
import { findFlashcardProposalProblems } from "@/features/assistant/flashcard-proposal-rules";
import {
  formatLibraryHitsForModel,
  type LibrarySearchInput,
  type LibrarySearchOutput,
  librarySearchInputSchema,
  librarySearchOutputSchema,
} from "@/features/assistant/library-search-contract";
import { findMindmapEditProblems } from "@/features/assistant/mindmap-edit-rules";
import { findNoteEditProblems } from "@/features/assistant/note-edit-rules";
import type { AssistantChatRequest } from "@/features/assistant/validation";
import { FLASHCARD_CARD_SHAPE_RULES } from "@/features/flashcards/ai-prompts";
import { MATH_RULE } from "@/lib/ai/prompt-rules";
import { LIMITS, SUBJECT_PATH_MAX_CHARS } from "@/lib/config/limits";

/** Most cards one proposal may hold; keeps a single turn reviewable. */
export const FLASHCARD_PROPOSAL_MAX_CARDS = 5;

const EXAMPLE_LANGUAGE_MAX_CHARS = 30;

/**
 * A code example kept apart from the back so the chat can show it in its own
 * section and the app, not the model, decides how it is appended to the card.
 *
 * @example
 * flashcardExampleSchema.parse({ language, code });
 */
export const flashcardExampleSchema = z.object({
  language: z
    .string()
    .trim()
    .max(EXAMPLE_LANGUAGE_MAX_CHARS)
    .describe("Code fence language tag, or an empty string for plain code."),
  code: z
    .string()
    .trim()
    .min(1)
    .max(LIMITS.flashcardBackMax)
    .describe(
      "A short, runnable supplementary example with necessary definitions and data. Include its result as a comment; do not duplicate the front or back.",
    ),
});

/**
 * One model-written card: plain text with the assistant's list, code fence,
 * and LaTeX conventions, converted to rich text only when the user creates it.
 * The optional code `example` is appended to the back on create, so the two
 * together must fit the back limit.
 *
 * @example
 * proposedFlashcardSchema.parse({ front, back });
 */
export const proposedFlashcardSchema = z
  .object({
    front: z
      .string()
      .trim()
      .min(1)
      .max(LIMITS.flashcardFrontMax)
      .describe(
        "The requested retrieval cue as plain text, never HTML. Use backticks or fenced code for an example-based question; keep its result on the back.",
      ),
    back: z
      .string()
      .trim()
      .min(1)
      .max(LIMITS.flashcardBackMax)
      .describe(
        "A concise answer to the front, as plain text with optional backticks for code or LaTeX for math; never HTML. Do not duplicate the supplementary example.",
      ),
    example: flashcardExampleSchema
      .optional()
      .describe("Only when the user asks for examples."),
    subjectPath: z
      .string()
      .trim()
      .max(SUBJECT_PATH_MAX_CHARS)
      .optional()
      .describe(
        "Copy an exact available subject path from request context; :: separates parent and child. Omit if none fits. Never invent a path.",
      ),
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
    .max(FLASHCARD_PROPOSAL_MAX_CARDS)
    .describe(
      `All requested cards in one call, exactly the requested count (one if unspecified), up to ${FLASHCARD_PROPOSAL_MAX_CARDS}. ${FLASHCARD_CARD_SHAPE_RULES} ${MATH_RULE}`,
    ),
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
 * the injected user-bound search. Proposal tools check calls against the open
 * draft or review card (see edit-guards.ts), so the model corrects a rejected
 * call itself.
 *
 * @example
 * streamChatResponse({ ...options, tools: buildAssistantTools(search, { documentDraft }) });
 */
export function buildAssistantTools(
  searchLibrary: LibrarySearchFunction,
  drafts: EditableDrafts = {},
) {
  const { draft, documentDraft, context } = drafts;
  const review = context?.kind === "review" ? context : undefined;
  const note = documentDraft?.kind === "note" ? documentDraft : undefined;
  const mindmap = documentDraft?.kind === "mindmap" ? documentDraft : undefined;
  return {
    proposeNoteEdits: tool({
      description:
        "Propose requested changes to the current note draft, including conversational follow-ups. Questions stay in chat. Target visible content only and preserve everything else. Send one concrete proposal for review in the document; acceptance enters normal autosave, while discarded, skipped, or stale proposals are unapplied. Block ids are internal; never mention them in chat.",
      inputSchema: guardEditSchema(
        noteEditsInputSchema,
        guardsFor(note, findNoteEditProblems),
      ),
      outputSchema: documentEditsOutputSchema,
    }),
    proposeMindmapEdits: tool({
      description:
        "Propose requested changes to the current mindmap draft, including conversational follow-ups. Questions stay in chat. Target visible content only and preserve everything else. Send one concrete proposal for review on the canvas; acceptance enters normal autosave, while discarded, skipped, or stale proposals are unapplied.",
      inputSchema: guardEditSchema(
        mindmapEditsInputSchema,
        guardsFor(mindmap, findMindmapEditProblems),
      ),
      outputSchema: documentEditsOutputSchema,
    }),
    proposeFlashcardEdits: tool({
      description:
        "Propose requested front/back changes to the current flashcard draft, including conversational follow-ups. Target this draft only when the request refers to it; corrections to earlier chat proposals use creation even while an editor is open. Questions stay in chat. Send only changed fields in one call for per-field review inside the editor. Acceptance changes the unsaved draft; discarded, skipped, or stale fields remain unapplied.",
      inputSchema: guardEditSchema(
        flashcardEditsInputSchema,
        guardsFor(draft, findFlashcardEditProblems),
      ),
      outputSchema: flashcardEditsOutputSchema,
    }),
    proposeFlashcards: tool({
      description:
        "Propose separate new flashcards or revise an earlier chat proposal at the user's request, including follow-up corrections to skipped proposals. For chat-proposal corrections, use this tool regardless of any open draft. Only requests targeting the current draft use its editor tool. Submit concrete cards directly for Create/Edit/Discard review in chat. Only created outcomes confirm saving; dismissed or skipped cards were not saved. This tool cannot change saved cards.",
      inputSchema: guardEditSchema(
        flashcardProposalInputSchema,
        guardsFor(review, findFlashcardProposalProblems),
      ),
      outputSchema: flashcardProposalOutputSchema,
    }),
    searchLibrary: tool({
      description:
        "Search the user's library only when asked to find their own material, at most once per reply. Keyword matching ignores case and accents and tolerates small typos; it does not match by meaning. Returns short excerpts, already linked in chat. Summarize them briefly without repeating links or claiming to read full documents. No hits means these terms did not match, not proof the topic is absent. Read-only; no review is needed.",
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

type EditableDrafts = Pick<
  AssistantChatRequest,
  "draft" | "documentDraft" | "context"
>;

// Without the material a rule checks against, the tool needs no guard.
function guardsFor<Input, Draft>(
  draft: Draft | undefined,
  findProblems: (input: Input, draft: Draft) => string[],
): EditGuard<Input>[] {
  return draft ? [(input) => findProblems(input, draft)] : [];
}

export type AssistantTools = InferUITools<
  ReturnType<typeof buildAssistantTools>
>;

/**
 * Expose creation/search and only the editor supported by current context.
 * Keep this selection fixed for every model step of the reply.
 * @example selectAssistantActiveTools({}); // creation and search
 */
export function selectAssistantActiveTools(
  context: Pick<AssistantChatRequest, "draft" | "documentDraft">,
): Array<keyof ReturnType<typeof buildAssistantTools>> {
  const base: Array<keyof ReturnType<typeof buildAssistantTools>> = [
    "proposeFlashcards",
    "searchLibrary",
  ];
  if (context.draft) return [...base, "proposeFlashcardEdits"];
  if (context.documentDraft?.kind === "note")
    return [...base, "proposeNoteEdits"];
  if (context.documentDraft?.kind === "mindmap")
    return [...base, "proposeMindmapEdits"];
  return base;
}
