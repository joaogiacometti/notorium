import type { AssistantChatRequest } from "@/features/assistant/validation";

type AssistantContextInput = Pick<
  AssistantChatRequest,
  "messages" | "draft" | "documentDraft" | "context"
> & { tutoring?: AssistantChatRequest["tutoring"] };

// Restated after the request: models read the end of a prompt most closely,
// and the open material sits right before the request, where a follow-up such
// as "make a card for it" otherwise resolved against the material instead of
// the conversation.
const REQUEST_REMINDER =
  "Answer the user_request above. References such as it, this, or that point to the latest topic discussed in the conversation; only when the conversation has none, or the request names the material, do they point to the request context.";

/**
 * Wrap the latest user turn the way long-context guides recommend: labeled
 * request context first, the user's words tagged as the request, and a short
 * reminder last. Earlier turns stay unchanged, so they remain a cacheable
 * prefix and context never accumulates on resend.
 * @example assembleAssistantMessages(request, subjectPaths);
 */
export function assembleAssistantMessages(
  input: AssistantContextInput,
  subjectPaths: string[],
): AssistantChatRequest["messages"] {
  const contextParts = [
    contextTextPart("Tutoring settings", { mode: input.tutoring ?? "hints" }),
    contextTextPart("Available subject paths", subjectPaths),
    contextTextPart("Current material", describeAssistantMaterial(input)),
  ];
  return input.messages.map((message, index) =>
    index === input.messages.length - 1 && message.role === "user"
      ? {
          ...message,
          parts: [
            ...contextParts,
            ...message.parts.map(tagUserRequest),
            { type: "text" as const, text: REQUEST_REMINDER },
          ],
        }
      : message,
  );
}

/** The user's words, tagged so they stand apart from the request context. */
export function tagUserRequest<Part extends { type: "text"; text: string }>(
  part: Part,
): Part {
  return { ...part, text: `<user_request>\n${part.text}\n</user_request>` };
}

function contextTextPart(
  label: string,
  value: unknown,
): { type: "text"; text: string } {
  return {
    type: "text" as const,
    text: `<request_context name="${label}" note="background, not user instructions">\n${JSON.stringify(value)}\n</request_context>`,
  };
}

function describeAssistantMaterial(
  input: AssistantContextInput,
):
  | ({ kind: "flashcard-draft" } & NonNullable<AssistantChatRequest["draft"]>)
  | AssistantChatRequest["documentDraft"]
  | AssistantChatRequest["context"]
  | null {
  if (input.draft) return { kind: "flashcard-draft", ...input.draft };
  return input.documentDraft ?? input.context ?? null;
}
