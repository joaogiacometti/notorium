import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildAssistantTools,
  FLASHCARD_PROPOSAL_MAX_CARDS,
  flashcardProposalInputSchema,
  selectAssistantActiveTools,
} from "@/features/assistant/tools";
import type { AssistantChatRequest } from "@/features/assistant/validation";
import { LIMITS } from "@/lib/config/limits";

const atpCard = { front: "What is ATP?", back: "Energy carrier." };

describe("flashcardProposalInputSchema", () => {
  it("accepts several cards with optional subject paths", () => {
    const parsed = flashcardProposalInputSchema.parse({
      cards: [
        { front: " What is ATP? ", back: "Energy carrier." },
        { ...atpCard, subjectPath: "Biology::Cells" },
      ],
    });

    expect(parsed.cards).toEqual([
      atpCard,
      { ...atpCard, subjectPath: "Biology::Cells" },
    ]);
  });

  it("rejects an empty or oversized card list", () => {
    const tooMany = Array(FLASHCARD_PROPOSAL_MAX_CARDS + 1).fill(atpCard);

    expect(flashcardProposalInputSchema.safeParse({ cards: [] }).success).toBe(
      false,
    );
    expect(
      flashcardProposalInputSchema.safeParse({ cards: tooMany }).success,
    ).toBe(false);
  });

  it("rejects a card with an empty front or over-long back", () => {
    const emptyFront = { front: "  ", back: "Energy carrier." };
    const longBack = {
      ...atpCard,
      back: "a".repeat(LIMITS.flashcardBackMax + 1),
    };

    expect(
      flashcardProposalInputSchema.safeParse({ cards: [emptyFront] }).success,
    ).toBe(false);
    expect(
      flashcardProposalInputSchema.safeParse({ cards: [longBack] }).success,
    ).toBe(false);
  });

  it("accepts a code example kept apart from the back", () => {
    const example = { language: "prolog", code: "p(1).\n\n?- p(X)." };

    const parsed = flashcardProposalInputSchema.parse({
      cards: [{ ...atpCard, example }],
    });

    expect(parsed.cards[0]?.example).toEqual(example);
  });

  it("rejects a card whose back and example together exceed the back limit", () => {
    const half = Math.ceil(LIMITS.flashcardBackMax / 2) + 1;
    const card = {
      front: "Long card",
      back: "a".repeat(half),
      example: { language: "text", code: "b".repeat(half) },
    };

    const result = flashcardProposalInputSchema.safeParse({ cards: [card] });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["cards", 0, "example"]);
  });
});

class EmptyToolLibrary {
  search = async (): Promise<{ hits: [] }> => ({ hits: [] });
}

describe("assistant tool availability", () => {
  it.each<{
    name: string;
    context: Pick<AssistantChatRequest, "draft" | "documentDraft">;
    editor?: string;
  }>([
    { name: "no editor", context: {} },
    {
      name: "flashcard",
      editor: "proposeFlashcardEdits",
      context: {
        draft: { sessionId: "card", revision: 0, front: "", back: "" },
      },
    },
    {
      name: "note",
      editor: "proposeNoteEdits",
      context: {
        documentDraft: {
          kind: "note",
          sessionId: "note",
          revision: 0,
          title: "Note",
          partial: false,
          blocks: [],
        },
      },
    },
    {
      name: "mindmap",
      editor: "proposeMindmapEdits",
      context: {
        documentDraft: {
          kind: "mindmap",
          sessionId: "map",
          revision: 0,
          title: "Map",
          partial: false,
          nodes: [],
          edges: [],
        },
      },
    },
  ])("exposes only the supported editor for $name", ({ context, editor }) => {
    expect(selectAssistantActiveTools(context)).toEqual([
      "proposeFlashcards",
      "searchLibrary",
      ...(editor ? [editor] : []),
    ]);
  });
  it("retains every tool definition for history, with only search executable", () => {
    const tools = buildAssistantTools(new EmptyToolLibrary().search);
    expect(Object.keys(tools)).toHaveLength(5);
    expect(
      Object.entries(tools)
        .filter(([, value]) => value.execute)
        .map(([name]) => name),
    ).toEqual(["searchLibrary"]);
    for (const definition of Object.values(tools)) {
      expect(
        JSON.stringify(z.toJSONSchema(definition.inputSchema as z.ZodType)),
      ).not.toMatch(/"(oneOf|anyOf|allOf|const)"/);
    }
  });
});
