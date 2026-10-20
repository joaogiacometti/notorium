import { describe, expect, it } from "vitest";
import {
  FLASHCARD_PROPOSAL_MAX_CARDS,
  flashcardProposalInputSchema,
} from "@/features/assistant/tools";
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
