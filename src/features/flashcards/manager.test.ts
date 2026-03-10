import { describe, expect, it } from "vitest";
import { filterFlashcardList } from "@/features/flashcards/manager";
import type { FlashcardListEntity } from "@/lib/server/api-contracts";

const flashcards: FlashcardListEntity[] = [
  {
    id: "card-1",
    userId: "user-1",
    subjectId: "subject-1",
    subjectName: "Math",
    front: "<p>Linear algebra</p>",
    back: "<p>Matrices and vectors</p>",
    state: "new",
    dueAt: new Date("2026-03-04T00:00:00.000Z"),
    stability: "0",
    difficulty: "0",
    ease: 250,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
  },
  {
    id: "card-2",
    userId: "user-1",
    subjectId: "subject-2",
    subjectName: "Physics",
    front: "<p>Newton second law</p>",
    back: "<p>Force equals mass times acceleration</p>",
    state: "review",
    dueAt: new Date("2026-03-05T00:00:00.000Z"),
    stability: "3.2",
    difficulty: "4.1",
    ease: 245,
    intervalDays: 7,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 4,
    lapseCount: 0,
    createdAt: new Date("2026-03-02T00:00:00.000Z"),
    updatedAt: new Date("2026-03-02T00:00:00.000Z"),
  },
  {
    id: "card-3",
    userId: "user-1",
    subjectId: "subject-3",
    subjectName: "Chemistry",
    front: "<p>pH scale</p>",
    back: "<p>Measures acidity and alkalinity</p>",
    state: "learning",
    dueAt: new Date("2026-03-06T00:00:00.000Z"),
    stability: "1.4",
    difficulty: "5.5",
    ease: 230,
    intervalDays: 2,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 1,
    lapseCount: 0,
    createdAt: new Date("2026-03-03T00:00:00.000Z"),
    updatedAt: new Date("2026-03-03T00:00:00.000Z"),
  },
];

describe("filterFlashcardList", () => {
  it("returns all flashcards when no subject filter is selected", () => {
    expect(
      filterFlashcardList({
        flashcards,
        searchQuery: "",
      }),
    ).toEqual(flashcards);
  });

  it("filters by one selected subject", () => {
    expect(
      filterFlashcardList({
        flashcards,
        searchQuery: "",
        subjectId: "subject-2",
      }).map((card) => card.id),
    ).toEqual(["card-2"]);
  });

  it("matches the search query against front, back, and subject name", () => {
    expect(
      filterFlashcardList({
        flashcards,
        searchQuery: "physics",
      }).map((card) => card.id),
    ).toEqual(["card-2"]);

    expect(
      filterFlashcardList({
        flashcards,
        searchQuery: "vectors",
      }).map((card) => card.id),
    ).toEqual(["card-1"]);
  });

  it("combines the search query with selected subjects", () => {
    expect(
      filterFlashcardList({
        flashcards,
        searchQuery: "scale",
        subjectId: "subject-3",
      }).map((card) => card.id),
    ).toEqual(["card-3"]);
  });
});
