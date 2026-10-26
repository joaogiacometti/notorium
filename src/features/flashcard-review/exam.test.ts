import { describe, expect, it } from "vitest";
import { shuffleExamCards } from "@/features/flashcard-review/exam";

describe("shuffleExamCards", () => {
  it("keeps every card exactly once without mutating the input", () => {
    const cards = ["a", "b", "c", "d", "e"];

    const shuffled = shuffleExamCards(cards);

    expect([...shuffled].sort()).toEqual(cards);
    expect(cards).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns an empty list for no cards", () => {
    expect(shuffleExamCards([])).toEqual([]);
  });
});
