import { z } from "zod";
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

const userMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.literal("user"),
  parts: z.array(userTextPartSchema).min(1).max(1),
});

const replyMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.literal("assistant"),
  parts: z
    .array(z.union([replyTextPartSchema, stepStartPartSchema]))
    .max(10)
    .transform((parts) => parts.filter((part) => part.type === "text")),
});

type ChatMessage =
  | z.infer<typeof userMessageSchema>
  | z.infer<typeof replyMessageSchema>;

// A reply stopped before its first token keeps no text; an empty assistant
// turn is rejected by some providers, so it is dropped instead.
function dropEmptyReplies(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter(
    (message) => message.role === "user" || message.parts.length > 0,
  );
}

/**
 * Request body of `POST /api/assistant/chat`: the whole non-persistent chat,
 * oldest first, ending with the user's new message. Only user and assistant
 * text is accepted, so a client cannot inject system messages or other parts.
 *
 * @example
 * assistantChatRequestSchema.safeParse({
 *   messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "What is ATP?" }] }],
 * });
 */
export const assistantChatRequestSchema = z.object({
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
