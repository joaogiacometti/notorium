import { describe, expect, it } from "vitest";
import { filterFlashcards } from "@/features/flashcards/flashcard-filters";
import type { FlashcardListEntity } from "@/lib/server/api-contracts";

function makeFlashcard(
  overrides: Partial<FlashcardListEntity> = {},
): FlashcardListEntity {
  return {
    id: "fc-1",
    front: "<p>Card front</p>",
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
    subjectId: "subject-1",
    userId: "user-1",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    subjectName: "Physics",
    ...overrides,
  };
}

describe("filterFlashcards", () => {
  it("filters by subject id", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({ id: "fc-1", subjectId: "subject-1" }),
        makeFlashcard({ id: "fc-2", subjectId: "subject-2" }),
      ],
      searchQuery: "",
      subjectId: "subject-1",
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

  it("matches subject name case-insensitively", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({ id: "fc-1", subjectName: "Linear Algebra" }),
        makeFlashcard({ id: "fc-2", subjectName: "World History" }),
      ],
      searchQuery: "ALGEBRA",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fc-1");
  });

  it("combines subject and search filters", () => {
    const result = filterFlashcards({
      flashcards: [
        makeFlashcard({
          id: "fc-1",
          subjectId: "subject-1",
          front: "<p>Cell division</p>",
          subjectName: "Biology",
        }),
        makeFlashcard({
          id: "fc-2",
          subjectId: "subject-2",
          front: "<p>Cell division</p>",
          subjectName: "Medicine",
        }),
        makeFlashcard({
          id: "fc-3",
          subjectId: "subject-1",
          front: "<p>Genetics</p>",
          subjectName: "Biology",
        }),
      ],
      searchQuery: "cell",
      subjectId: "subject-1",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("fc-1");
  });
});
