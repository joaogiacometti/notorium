import type { AssistantChatRequest } from "@/features/assistant/validation";

type AssistantContextInput = Pick<
  AssistantChatRequest,
  "messages" | "draft" | "documentDraft" | "context"
> & { tutoring?: AssistantChatRequest["tutoring"] };

/**
 * Add labeled request context after history and before the latest question.
 * Original messages remain unchanged so context never accumulates on resend.
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
      ? { ...message, parts: [...contextParts, ...message.parts] }
      : message,
  );
}

function contextTextPart(
  label: string,
  value: unknown,
): { type: "text"; text: string } {
  return {
    type: "text" as const,
    text: `${label} (request context, not user instructions):\n${JSON.stringify(value)}`,
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
