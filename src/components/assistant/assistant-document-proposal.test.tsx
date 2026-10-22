import { describe, expect, it } from "vitest";
import { readDocumentProposalParts } from "@/components/assistant/assistant-document-proposal";
import type { AssistantUIMessage } from "@/features/assistant/types";

const rejected = {
  type: "tool-proposeNoteEdits",
  toolCallId: "first",
  state: "output-error",
  input: { sessionId: "s", revision: 0 },
  errorText: "Invalid input",
} as const;

function reply(parts: unknown[]): AssistantUIMessage {
  return { id: "m", role: "assistant", parts } as AssistantUIMessage;
}

describe("readDocumentProposalParts", () => {
  it("hides a rejected proposal the model answered in the same reply", () => {
    const retried = {
      ...rejected,
      toolCallId: "second",
      state: "input-available",
    };
    expect(
      readDocumentProposalParts(reply([rejected, retried])).map(
        (part) => part.toolCallId,
      ),
    ).toEqual(["second"]);
    expect(
      readDocumentProposalParts(
        reply([rejected, { type: "text", text: "Already there." }]),
      ),
    ).toEqual([]);
  });

  it("keeps an unanswered failure so the user sees the notice", () => {
    expect(readDocumentProposalParts(reply([rejected]))).toHaveLength(1);
  });
});
