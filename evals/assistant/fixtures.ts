import type { AssistantEvalCase } from "./harness";

/**
 * Text-only chat, oldest first, alternating user and assistant from a user turn.
 * @example conversation("What is ATP?", "An energy carrier.", "Add that");
 */
export function conversation(
  ...turns: string[]
): AssistantEvalCase["messages"] {
  return turns.map((text, index) => ({
    id: `m${index}`,
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    parts: [{ type: "text" as const, text }],
  }));
}

/**
 * A lesson already under way: its start marker, one question, and the user's reply.
 * @example activeLesson("Fractions", "What is half of 4?", "2");
 */
export function activeLesson(
  topic: string,
  question: string,
  userReply: string,
): AssistantEvalCase["messages"] {
  return [
    {
      id: "m0",
      role: "user",
      parts: [{ type: "text", text: `/learn ${topic}` }],
    },
    {
      id: "m1",
      role: "assistant",
      parts: [
        {
          type: "tool-startGuidedLesson",
          toolCallId: "lesson",
          state: "output-available",
          input: { topic },
          output: { topic },
        },
        { type: "text", text: question },
      ],
    },
    { id: "m2", role: "user", parts: [{ type: "text", text: userReply }] },
  ];
}

/**
 * Request fields for one open note holding `content` as its only block.
 * @example openNote("Mitochondria produce ATP.");
 */
export function openNote(content: string): AssistantEvalCase["request"] {
  return {
    documentDraft: {
      kind: "note",
      sessionId: "eval-session",
      revision: 0,
      title: "Cell biology",
      partial: false,
      blocks: [{ id: "b0", html: `<p>${content}</p>` }],
    },
  };
}
