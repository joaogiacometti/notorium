import { z } from "zod";
import {
  flashcardDraftSchema,
  flashcardEditsInputSchema,
  flashcardEditsOutputSchema,
} from "@/features/assistant/edit-contract";
import {
  flashcardProposalInputSchema,
  flashcardProposalOutputSchema,
} from "@/features/assistant/tools";
import { LIMITS } from "@/lib/config/limits";

const userTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().trim().min(1).max(LIMITS.assistantMessageMaxChars),
});

const replyTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(LIMITS.assistantReplyMaxChars),
});

// `useChat` stores a `step-start` marker in every streamed reply; it carries no
// content, so it is accepted and dropped before the history reaches the model.
const stepStartPartSchema = z.object({ type: z.literal("step-start") });

// A proposal the user handled (created, dismissed, or skipped cards) goes back
// to the model with its outcomes, so later turns know what happened to it.
const answeredProposalPartSchema = z
  .object({
    type: z.literal("tool-proposeFlashcards"),
    toolCallId: z.string().min(1).max(100),
    state: z.literal("output-available"),
    input: flashcardProposalInputSchema,
    output: flashcardProposalOutputSchema,
  })
  .refine((part) => part.output.outcomes.length === part.input.cards.length, {
    message: "A proposal needs one outcome per proposed card",
  });

// A proposal still waiting for the user, cut off mid-stream, or rejected by
// the SDK for invalid model input (`output-error`) has no usable output; a
// tool call without a result is rejected by providers, so it is accepted and
// dropped like `step-start` instead of failing every later request.
const unansweredProposalPartSchema = z.object({
  type: z.literal("tool-proposeFlashcards"),
  state: z.enum(["input-streaming", "input-available", "output-error"]),
});

const answeredEditsPartSchema = z
  .object({
    type: z.literal("tool-proposeFlashcardEdits"),
    toolCallId: z.string().min(1).max(100),
    state: z.literal("output-available"),
    input: flashcardEditsInputSchema,
    output: flashcardEditsOutputSchema,
  })
  .refine(
    (part) =>
      (["front", "back"] as const).every(
        (field) =>
          (part.input[field] === undefined) ===
          (part.output[field] === undefined),
      ),
    { message: "Expected one outcome per proposed field" },
  );

const unansweredEditsPartSchema = z.object({
  type: z.literal("tool-proposeFlashcardEdits"),
  state: z.enum(["input-streaming", "input-available", "output-error"]),
});

const replyPartSchema = z.union([
  answeredEditsPartSchema,
  unansweredEditsPartSchema,
  replyTextPartSchema,
  stepStartPartSchema,
  answeredProposalPartSchema,
  unansweredProposalPartSchema,
]);

type ReplyPart = z.infer<typeof replyPartSchema>;

function isModelVisiblePart(
  part: ReplyPart,
): part is
  | z.infer<typeof replyTextPartSchema>
  | z.infer<typeof answeredProposalPartSchema>
  | z.infer<typeof answeredEditsPartSchema> {
  return (
    part.type === "text" ||
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
  // Room for text, step markers, and a few flashcard proposals.
  parts: z
    .array(replyPartSchema)
    .max(16)
    .transform((parts) => parts.filter(isModelVisiblePart)),
});

type ChatMessage =
  | z.infer<typeof userMessageSchema>
  | z.infer<typeof replyMessageSchema>;

// A reply stopped before its first token keeps no text, and one holding only
// pending proposals keeps nothing; an empty assistant turn is rejected by some
// providers, so it is dropped instead.
function dropEmptyReplies(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(
    (message) => message.role === "user" || message.parts.length > 0,
  );
}

/**
 * Request body of `POST /api/assistant/chat`: the `useChat` id and the whole
 * non-persistent chat, oldest first, ending with the user's new message. The
 * id is optional so a tab loaded before it was sent keeps working. Only user
 * text, assistant text, and answered flashcard proposals are accepted, so a
 * client cannot inject system messages or other parts.
 *
 * @example
 * assistantChatRequestSchema.safeParse({
 *   chatId: "chat-1",
 *   messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "What is ATP?" }] }],
 * });
 */
export const assistantChatRequestSchema = z.object({
  draft: flashcardDraftSchema.optional(),
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
});

export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;
