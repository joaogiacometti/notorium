import { describe, expect, it } from "vitest";
import { findFlashcardProposalProblems } from "@/features/assistant/flashcard-proposal-rules";

const review = {
  kind: "review" as const,
  mode: "review" as const,
  front: "<p>What is an aggregate root in Domain-Driven Design?</p>",
  hiddenBack: "<p>The entry point of an aggregate.</p>",
};

function problems(...fronts: string[]) {
  return findFlashcardProposalProblems(
    { cards: fronts.map((front) => ({ front })) },
    review,
  );
}

describe("flashcard proposal rules", () => {
  it("rejects a card that repeats the card under review, also reworded", () => {
    expect(
      problems(
        "What is an aggregate root in Domain-Driven Design?",
        "In Domain-Driven Design, what is the aggregate root?",
      ),
    ).toEqual([
      "Card 1 asks what the card under review already asks, and the user already has that card; expected a new proposal now, without asking first, with a card on the latest topic discussed in the conversation",
      "Card 2 asks what the card under review already asks, and the user already has that card; expected a new proposal now, without asking first, with a card on the latest topic discussed in the conversation",
    ]);
  });

  it("accepts cards on other topics or other questions about the same topic", () => {
    expect(
      problems("What is algebra?", "Why should aggregates stay small?"),
    ).toEqual([]);
  });

  it("compares short fronts only as exact matches", () => {
    const short = { ...review, front: "<p>What is ATP?</p>" };
    const check = (front: string) =>
      findFlashcardProposalProblems({ cards: [{ front }] }, short);
    expect(check("what is ATP")).toHaveLength(1);
    expect(check("What is ADP?")).toEqual([]);
  });
});
