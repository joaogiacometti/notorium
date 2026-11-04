import { expect } from "vitest";
import { conversation, openNote } from "./fixtures";
import { runAssistantEvals } from "./harness";

const note = openNote("Mitochondria produce ATP.");

runAssistantEvals("edit-permission", [
  {
    name: "a question about an open note is answered in chat",
    messages: conversation("Why do mitochondria have a double membrane?"),
    request: note,
    check: (reply) => {
      expect(reply.toolNames).not.toContain("proposeNoteEdits");
      expect(reply.text).toMatch(/membrane/i);
    },
  },
  {
    name: "a short follow-up proposes the edit",
    messages: conversation(
      "What is ATP?",
      "ATP is the molecule that stores and transfers energy in cells.",
      "add some examples of that too",
    ),
    request: note,
    check: (reply) => {
      expect(reply.toolNames).toContain("proposeNoteEdits");
      expect(JSON.stringify(reply.tools)).toMatch(/atp|energy/i);
    },
  },
]);
