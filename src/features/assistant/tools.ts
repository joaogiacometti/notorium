import { type InferUITools, tool } from "ai";
import { z } from "zod";
import { answerChoicesSchema } from "@/features/assistant/answer-choices-contract";
import {
  documentEditsOutputSchema,
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
import { findNoteEditProblems } from "@/features/assistant/note-edit-rules";
import type { AssistantChatRequest } from "@/features/assistant/validation";
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
      .refine(hasNoBrokenJsonEscapes, {
        message:
          "Control character in front; expected literal LaTeX backslashes escaped for JSON, not backspace or form feed",
      })
      .describe(
        "The front as plain text, never HTML. Use backticks for inline code or language-tagged fences for code blocks; dollar-delimited LaTeX for math.",
      ),
    back: z
      .string()
      .trim()
      .min(1)
      .max(LIMITS.flashcardBackMax)
      .refine(hasNoBrokenJsonEscapes, {
        message:
          "Control character in back; expected literal LaTeX backslashes escaped for JSON, not backspace or form feed",
      })
      .describe(
        'The back as plain text, never HTML. Start each bullet with "- "; use backticks for inline code and dollar-delimited LaTeX for math. A short prose or inline-code illustration belongs in a final back bullet, not the separate code example field.',
      ),
    example: flashcardExampleSchema
      .optional()
      .describe(
        "Optional supplementary code block, appended to the back on creation. Use only when a code block adds value; keep prose and inline-code illustrations in the back. Omit when the example is already in the front or back.",
      ),
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
      `All supported cards in one call, the requested count (one if unspecified), up to ${FLASHCARD_PROPOSAL_MAX_CARDS}. If the requested source cannot support that many accurate cards, propose fewer and explain the limitation rather than inventing content.`,
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

function hasNoBrokenJsonEscapes(text: string): boolean {
  return !text.includes("\b") && !text.includes("\f");
}

/** Runs one `searchLibrary` call for the current user; injected by the service. */
export type LibrarySearchFunction = (
  input: LibrarySearchInput,
) => Promise<LibrarySearchOutput>;

/**
 * Study assistant tools. The proposal tools have no `execute`: the call ends
 * the reply and the chat shows the cards or edits for the user to accept, so
 * nothing is written without the user's click and the route stays write-free.
 * `searchLibrary` runs on the server and only reads, through the injected
 * user-bound search. Proposal tools check calls against the open draft or
 * review card (see edit-guards.ts), so the model corrects a rejected call
 * itself.
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
        "Propose separate new flashcards for Create/Edit/Discard review in chat, or revise an earlier chat proposal, including corrections to skipped proposals, regardless of any open draft. Check the topic first. If no earlier message explained it and no open material covers it, do not call this tool on the first request for cards, even though the request itself names the topic: writing cards is itself learning, so make the flashcard offer with showAnswerChoices. Otherwise call this tool right away, even if the user only asks whether to make a card, favoring ideas they found hard, and never describe a card in chat instead. Also call it when they type the card content, answer the offer by choosing you or declining, or repeat the request. Only requests targeting the current draft use its editor tool. Only created outcomes confirm saving; dismissed or skipped cards were not saved. This tool cannot change saved cards.",
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
    showAnswerChoices: tool({
      description:
        "Show a question with clickable answers. The question goes here and is shown to the user, so write no chat text with this call, unless a prerequisite must be explained first; chat text must never ask or restate the question. Use it only when the user asks for options, has already been unable to answer a free-text question on the idea, or for the flashcard offer. Never use it for a first check of an idea: producing an answer teaches more than recognizing one, so those are free-text questions in chat. Flashcard offer: with no chat text, ask only whether they want to put the key ideas in their own words first, with two options: giving the key ideas themselves, or you making the cards now. Do not say generated cards are bad; reviewing them still helps. Call once as the end of the reply. Do not reveal the correct option. The selected option arrives as the next user message; evaluate it before moving on.",
      inputSchema: answerChoicesSchema,
      outputSchema: answerChoicesSchema,
      execute: (input) => input,
      toModelOutput: () => ({
        type: "text",
        value:
          "The question and choices are displayed. Wait for the user's response; do not add text or another question.",
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
 * Expose creation, search, answer choices unless learning support is off, and
 * only the editor supported by current context.
 * Completed one-shot tools are hidden by the streaming layer.
 * @example selectAssistantActiveTools({}); // creation, search, and answer choices
 */
export function selectAssistantActiveTools(
  context: Pick<AssistantChatRequest, "draft" | "documentDraft"> & {
    bypassLearning?: boolean;
  },
): Array<keyof ReturnType<typeof buildAssistantTools>> {
  const base: Array<keyof ReturnType<typeof buildAssistantTools>> = [
    "proposeFlashcards",
    "searchLibrary",
  ];
  if (!context.bypassLearning) base.push("showAnswerChoices");
  if (context.draft) return [...base, "proposeFlashcardEdits"];
  if (context.documentDraft?.kind === "note")
    return [...base, "proposeNoteEdits"];
  return base;
}
