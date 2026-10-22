import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  documentDraftSchema,
  mindmapEditsInputSchema,
  noteEditsInputSchema,
} from "@/features/assistant/document-edit-contract";
import { assistantChatRequestSchema } from "@/features/assistant/validation";

describe("document edit contracts", () => {
  it("requires a change and a captured revision", () => {
    expect(
      noteEditsInputSchema.safeParse({
        sessionId: "s",
        revision: 0,
        replacements: [],
      }).success,
    ).toBe(false);
    expect(
      noteEditsInputSchema.safeParse({
        sessionId: "s",
        revision: -1,
        title: "Changed",
        insertions: [],
      }).success,
    ).toBe(false);
    expect(
      noteEditsInputSchema.parse({
        sessionId: "s",
        revision: 0,
        title: "Changed",
        insertions: [],
      }).title,
    ).toBe("Changed");
  });
  it("rejects mindmap proposals without a known operation", () => {
    expect(
      mindmapEditsInputSchema.safeParse({
        sessionId: "s",
        revision: 0,
        operations: [{ kind: "replaceGraph" }],
      }).success,
    ).toBe(false);
    expect(
      mindmapEditsInputSchema.safeParse({
        sessionId: "s",
        revision: 0,
        removeNodes: [{ nodeId: "a" }],
      }).success,
    ).toBe(true);
  });
  // Regression: Gemini function calling rejects `oneOf`/`anyOf`/`const`, so a
  // union-based tool schema made every first proposal fail validation.
  it.each([
    ["note", noteEditsInputSchema],
    ["mindmap", mindmapEditsInputSchema],
  ])("exposes a union-free %s tool schema", (_name, schema) => {
    expect(JSON.stringify(z.toJSONSchema(schema))).not.toMatch(
      /"(oneOf|anyOf|allOf|const)"/,
    );
  });
  it("bounds the combined draft context", () => {
    expect(
      documentDraftSchema.safeParse({
        kind: "note",
        sessionId: "s",
        revision: 0,
        title: "Title",
        partial: false,
        blocks: [{ id: "b0", html: "x".repeat(12001) }],
      }).success,
    ).toBe(false);
  });
  it("accepts resolved document tool history and rejects competing current contexts", () => {
    const documentDraft = {
      kind: "note" as const,
      sessionId: "s",
      revision: 0,
      title: "Title",
      partial: false,
      blocks: [{ id: "b0", html: "<p>Original</p>" }],
    };
    const input = {
      sessionId: "s",
      revision: 0,
      replacements: [
        { firstBlockId: "b0", lastBlockId: "b0", html: "<p>Improved</p>" },
      ],
    };
    const messages = [
      {
        id: "a",
        role: "assistant",
        parts: [
          {
            type: "tool-proposeNoteEdits",
            state: "output-available",
            toolCallId: "t",
            input,
            output: { outcome: "accepted" },
          },
        ],
      },
      { id: "u", role: "user", parts: [{ type: "text", text: "Continue" }] },
    ];
    expect(
      assistantChatRequestSchema.parse({ documentDraft, messages }).messages,
    ).toHaveLength(2);
    expect(
      assistantChatRequestSchema.safeParse({
        documentDraft,
        messages,
        context: {
          kind: "note",
          title: "Other",
          content: "Text",
          partial: false,
        },
      }).success,
    ).toBe(false);
    expect(
      assistantChatRequestSchema.parse({
        documentDraft,
        messages: [
          {
            id: "a",
            role: "assistant",
            parts: [
              { type: "tool-proposeNoteEdits", state: "input-available" },
            ],
          },
          messages[1],
        ],
      }).messages,
    ).toHaveLength(1);
  });
});
