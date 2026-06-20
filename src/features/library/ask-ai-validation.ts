import { z } from "zod";
import { LIMITS } from "@/lib/config/limits";

// One turn in the reader's "Ask AI about the selection" thread. `user` turns are
// the student's questions; `assistant` turns are prior AI answers replayed back
// as context so follow-up questions stay grounded in the conversation.
export const askAiChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(LIMITS.aiAskMessageMax),
});

export type AskAiChatMessage = z.infer<typeof askAiChatMessageSchema>;

// The latest turn must be a student question, otherwise there is nothing for the
// AI to answer — guards against a malformed thread reaching the model.
export const askAiAboutTextSchema = z.object({
  sourceText: z.string().trim().min(1).max(LIMITS.aiAskSourceMax),
  messages: z
    .array(askAiChatMessageSchema)
    .min(1)
    .max(LIMITS.aiAskMaxMessages)
    .refine((messages) => messages.at(-1)?.role === "user", {
      message: "The last message must be a question from the student.",
    }),
});

export type AskAiAboutTextForm = z.infer<typeof askAiAboutTextSchema>;
