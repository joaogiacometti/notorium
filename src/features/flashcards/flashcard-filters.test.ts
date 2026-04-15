import { describe, expect, it } from "vitest";
import { filterFlashcards } from "@/features/flashcards/flashcard-filters";
import type { FlashcardListEntity } from "@/lib/server/api-contracts";

function makeFlashcard(
  overrides: Partial<FlashcardListEntity> = {},
): FlashcardListEntity {
  return {
    id: "fc-1",
    front: "<p>Card front</p>",
    frontNormalized: "card front",
    back: "<p>Card back</p>",
    state: "new",
    dueAt: new Date("2026-03-01T00:00:00.000Z"),
    stability: null,
    difficulty: null,
    ease: 250,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    userId: "user-1",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    deckId: "deck-1",
    deckName: "Default Deck",
    deckPath: "Default Deck",
    ...overrides,
  };
}

describe("filterFlashcards", () => {
  it("filters by deck id", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({ id: "fc-1", deckId: "deck-1" }),
        makeFlashcard({ id: "fc-2", deckId: "deck-2" }),
      ],
      searchQuery: "",
      deckId: "deck-1",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fc-1");
  });

  it("treats empty search as no filter", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({ id: "fc-1" }),
        makeFlashcard({ id: "fc-2" }),
      ],
      searchQuery: "   ",
    });

    expect(result).toHaveLength(2);
  });

  it("matches front rich text plain text", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({ id: "fc-1", front: "<p>Binary trees</p>" }),
        makeFlashcard({ id: "fc-2", front: "<p>Organic chemistry</p>" }),
      ],
      searchQuery: "binary",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fc-1");
  });

  it("matches back rich text plain text", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({ id: "fc-1", back: "<p>Uses DFS traversal</p>" }),
        makeFlashcard({ id: "fc-2", back: "<p>Photosynthesis basics</p>" }),
      ],
      searchQuery: "dfs traversal",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fc-1");
  });

  it("matches deck name case-insensitively", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({ id: "fc-1", deckName: "Linear Algebra" }),
        makeFlashcard({ id: "fc-2", deckName: "World History" }),
      ],
      searchQuery: "ALGEBRA",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fc-1");
  });

  it("combines deck and search filters", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({
          id: "fc-1",
          deckId: "deck-1",
          front: "<p>Cell division</p>",
          deckName: "Biology",
        }),
        makeFlashcard({
          id: "fc-2",
          deckId: "deck-2",
          front: "<p>Cell division</p>",
          deckName: "Medicine",
        }),
        makeFlashcard({
          id: "fc-3",
          deckId: "deck-1",
          front: "<p>Genetics</p>",
          deckName: "Biology",
        }),
      ],
      searchQuery: "cell",
      deckId: "deck-1",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fc-1");
  });
});
