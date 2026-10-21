import { describe, expect, it } from "vitest";
import {
  flashcardDraftSchema,
  flashcardEditsInputSchema,
} from "@/features/assistant/edit-contract";
import { assistantChatRequestSchema } from "@/features/assistant/validation";
import { LIMITS } from "@/lib/config/limits";

const draft = { sessionId: "draft-1", revision: 0, front: "", back: "" };

describe("assistant flashcard edit contracts", () => {
  it("accepts an incomplete unsaved draft", () => {
    expect(flashcardDraftSchema.parse(draft)).toEqual(draft);
  });

  it("limits HTML and visible content independently", () => {
    expect(
      flashcardDraftSchema.safeParse({
        ...draft,
        front: `<p>${"x".repeat(LIMITS.flashcardFrontMax + 1)}</p>`,
      }).success,
    ).toBe(false);
    expect(
      flashcardDraftSchema.safeParse({
        ...draft,
        front: `<p title="${"x".repeat(100_001)}">ok</p>`,
      }).success,
    ).toBe(false);
  });

  it("requires a replacement and a valid revision", () => {
    expect(
      flashcardEditsInputSchema.safeParse({ sessionId: "d", revision: 0 })
        .success,
    ).toBe(false);
    expect(
      flashcardEditsInputSchema.safeParse({
        sessionId: "d",
        revision: -1,
        back: "answer",
      }).success,
    ).toBe(false);
  });

  it("keeps handled edit outcomes and removes incomplete calls from history", () => {
    const result = assistantChatRequestSchema.parse({
      draft,
      messages: [
        {
          id: "a",
          role: "assistant",
          parts: [
            {
              type: "tool-proposeFlashcardEdits",
              toolCallId: "t",
              state: "output-available",
              input: { sessionId: "d", revision: 0, back: "answer" },
              output: { back: "accepted" },
            },
            { type: "tool-proposeFlashcardEdits", state: "input-streaming" },
          ],
        },
        {
          id: "u",
          role: "user",
          parts: [{ type: "text", text: "Shorten it" }],
        },
      ],
    });
    expect(result.messages[0].parts).toHaveLength(1);
    expect(result.draft).toEqual(draft);
  });

  it("rejects outcomes missing a proposed field", () => {
    expect(
      assistantChatRequestSchema.safeParse({
        messages: [
          {
            id: "a",
            role: "assistant",
            parts: [
              {
                type: "tool-proposeFlashcardEdits",
                toolCallId: "t",
                state: "output-available",
                input: { sessionId: "d", revision: 0, back: "answer" },
                output: {},
              },
            ],
          },
          { id: "u", role: "user", parts: [{ type: "text", text: "Again" }] },
        ],
      }).success,
    ).toBe(false);
  });
});
