import { describe, expect, it } from "vitest";
import { filterFlashcardList } from "@/features/flashcards/manager";
import type { FlashcardListEntity } from "@/lib/server/api-contracts";

function makeFlashcard(
  overrides: Partial<FlashcardListEntity> = {},
): FlashcardListEntity {
  const now = new Date("2026-03-09T00:00:00.000Z");

  return {
    id: "card-1",
    subjectId: "subject-1",
    userId: "user-1",
    front: "<p>Binary tree</p>",
    back: "<p>Hierarchical structure</p>",
    state: "new",
    dueAt: now,
    stability: null,
    difficulty: null,
    ease: 250,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    createdAt: now,
    updatedAt: now,
    subjectName: "Algorithms",
    ...overrides,
  };
}

describe("filterFlashcardList", () => {
  it("filters by subject when subjectId is provided", () => {
    const cards = [
      makeFlashcard(),
      makeFlashcard({
        id: "card-2",
        subjectId: "subject-2",
        subjectName: "Physics",
      }),
    ];

    expect(
      filterFlashcardList({
        flashcards: cards,
        searchQuery: "",
        subjectId: "subject-2",
      }),
    ).toEqual([cards[1]]);
  });

  it("matches search against card content and subject name", () => {
    const cards = [
      makeFlashcard(),
      makeFlashcard({
        id: "card-2",
        front: "<p>Momentum</p>",
        back: "<p>Mass times velocity</p>",
        subjectName: "Physics",
      }),
    ];

    expect(
      filterFlashcardList({
        flashcards: cards,
        searchQuery: "physics",
      }),
    ).toEqual([cards[1]]);
  });
});
