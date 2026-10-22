import { z } from "zod";
import {
  documentDraftSchema,
  documentEditsOutputSchema,
  mindmapEditsInputSchema,
  noteEditsInputSchema,
} from "@/features/assistant/document-edit-contract";
import {
  flashcardDraftSchema,
  flashcardEditsInputSchema,
  flashcardEditsOutputSchema,
} from "@/features/assistant/edit-contract";
import {
  librarySearchInputSchema,
  librarySearchOutputSchema,
} from "@/features/assistant/library-search-contract";
import { studyContextSchema } from "@/features/assistant/study-context";
import {
  flashcardProposalInputSchema,
  flashcardProposalOutputSchema,
} from "@/features/assistant/tools";
import { LIMITS } from "@/lib/config/limits";

/** How the assistant handles problems: graduated hints first, or direct answers.
 * @example tutoringModeSchema.parse("hints");
 */
export const tutoringModeSchema = z.enum(["hints", "answers"]);
export type TutoringMode = z.infer<typeof tutoringModeSchema>;

/** Cookie that keeps the user's tutoring toggle across reloads. */
export const TUTORING_MODE_COOKIE = "notorium:assistant-tutoring";

/** Saved tutoring mode; a missing or unknown cookie value falls back to hints.
 * @example parseSavedTutoringMode(undefined); // "hints"
 */
export function parseSavedTutoringMode(
  value: string | undefined,
): TutoringMode {
  return tutoringModeSchema.catch("hints").parse(value);
}

const userTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().trim().min(1).max(LIMITS.assistantMessageMaxChars),
});

const replyTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(LIMITS.assistantReplyMaxChars),
});

// `useChat` stores a `step-start` marker before each model step of a reply.
// It is kept: the history conversion splits a reply into steps at these
// markers, and without them a search result would follow the answer it fed.
const stepStartPartSchema = z.object({ type: z.literal("step-start") });

// An answered tool call goes back to the model with its result: a handled
// proposal (created, dismissed, or skipped cards) so later turns know what
// happened to it, and a finished library search so follow-up questions
// ("open the second one") know what was found.
function answeredToolPartSchema<
  TType extends string,
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
>(type: TType, input: TInput, output: TOutput) {
  return z.object({
    type: z.literal(type),
    toolCallId: z.string().min(1).max(100),
    state: z.literal("output-available"),
    input,
    output,
  });
}

const answeredProposalPartSchema = answeredToolPartSchema(
  "tool-proposeFlashcards",
  flashcardProposalInputSchema,
  flashcardProposalOutputSchema,
).refine((part) => part.output.outcomes.length === part.input.cards.length, {
  message: "A proposal needs one outcome per proposed card",
});

const answeredEditsPartSchema = answeredToolPartSchema(
  "tool-proposeFlashcardEdits",
  flashcardEditsInputSchema,
  flashcardEditsOutputSchema,
).refine(
  (part) =>
    (["front", "back"] as const).every(
      (field) =>
        (part.input[field] === undefined) ===
        (part.output[field] === undefined),
    ),
  { message: "Expected one outcome per proposed field" },
);

const answeredLibrarySearchPartSchema = answeredToolPartSchema(
  "tool-searchLibrary",
  librarySearchInputSchema,
  librarySearchOutputSchema,
);

// A tool call still waiting for the user, cut off mid-stream, or failed or
// rejected by the SDK for invalid model input (`output-error`) has no usable
// output; a tool call without a result is rejected by providers, so it is
// accepted and dropped instead of failing every later request.
const unansweredToolPartSchema = z.object({
  type: z.enum([
    "tool-proposeFlashcards",
    "tool-proposeFlashcardEdits",
    "tool-proposeNoteEdits",
    "tool-proposeMindmapEdits",
    "tool-searchLibrary",
  ]),
  state: z.enum(["input-streaming", "input-available", "output-error"]),
});

const replyPartSchema = z.union([
  replyTextPartSchema,
  stepStartPartSchema,
  answeredProposalPartSchema,
  answeredEditsPartSchema,
  answeredLibrarySearchPartSchema,
  answeredToolPartSchema(
    "tool-proposeNoteEdits",
    noteEditsInputSchema,
    documentEditsOutputSchema,
  ),
  answeredToolPartSchema(
    "tool-proposeMindmapEdits",
    mindmapEditsInputSchema,
    documentEditsOutputSchema,
  ),
  unansweredToolPartSchema,
]);

type ReplyPart = z.infer<typeof replyPartSchema>;

function isModelVisiblePart(
  part: ReplyPart,
): part is Exclude<ReplyPart, z.infer<typeof unansweredToolPartSchema>> {
  return (
    part.type === "text" ||
    part.type === "step-start" ||
    ("state" in part && part.state === "output-available")
  );
}

const userMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.literal("user"),
  parts: z.array(userTextPartSchema).min(1).max(1),
});

const replyMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.literal("assistant"),
  // Room for text, step markers, a search, and a few flashcard proposals.
  parts: z
    .array(replyPartSchema)
    .max(16)
    .transform((parts) => parts.filter(isModelVisiblePart)),
});

type ChatMessage =
  | z.infer<typeof userMessageSchema>
  | z.infer<typeof replyMessageSchema>;

// A reply stopped before its first token keeps only step markers, and one
// holding only pending proposals keeps nothing; an empty assistant turn is
// rejected by some providers, so it is dropped instead.
function dropEmptyReplies(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(
    (message) =>
      message.role === "user" ||
      message.parts.some((part) => part.type !== "step-start"),
  );
}

/**
 * Request body of `POST /api/assistant/chat`: the `useChat` id and the whole
 * non-persistent chat, oldest first, ending with the user's new message. The
 * id is optional so a tab loaded before it was sent keeps working. Only user
 * text, assistant text, answered flashcard proposals, and library searches
 * are accepted, so a client cannot inject system messages or other parts.
 *
 * @example
 * assistantChatRequestSchema.safeParse({
 *   chatId: "chat-1",
 *   messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "What is ATP?" }] }],
 * });
 */
export const assistantChatRequestSchema = z
  .object({
    draft: flashcardDraftSchema.optional(),
    documentDraft: documentDraftSchema.optional(),
    context: studyContextSchema.optional(),
    // Defaults to hints so tabs loaded before the toggle existed stay guarded.
    tutoring: tutoringModeSchema.default("hints"),
    chatId: z.string().min(1).max(100).optional(),
    messages: z
      .array(
        z.discriminatedUnion("role", [userMessageSchema, replyMessageSchema]),
      )
      .min(1)
      .max(LIMITS.assistantMaxMessages)
      .refine((messages) => messages.at(-1)?.role === "user", {
        message: "The last chat message must come from the user",
      })
      .transform(dropEmptyReplies),
  })
  .refine(
    (request) =>
      [request.draft, request.documentDraft, request.context].filter(Boolean)
        .length <= 1,
    {
      message: "Expected one flashcard draft, document draft, or study context",
    },
  );

export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;
