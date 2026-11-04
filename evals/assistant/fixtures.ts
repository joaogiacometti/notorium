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
