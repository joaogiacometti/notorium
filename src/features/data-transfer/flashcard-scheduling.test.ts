import { describe, expect, it } from "vitest";
import { getImportedFlashcardSchedulingState } from "@/features/data-transfer/flashcard-scheduling";

const validFlashcard = {
  front: "Question",
  back: "Answer",
  state: "review" as const,
  dueAt: "2026-01-02T00:00:00.000Z",
  stability: 3.5,
  difficulty: 4.2,
  ease: 250,
  intervalDays: 7,
  learningStep: null,
  lastReviewedAt: "2026-01-01T00:00:00.000Z",
  reviewCount: 5,
  lapseCount: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("getImportedFlashcardSchedulingState", () => {
  it("preserves valid imported scheduling state", () => {
    const result = getImportedFlashcardSchedulingState(validFlashcard);

    expect(result).toMatchObject({
      state: "review",
      stability: "3.5000",
      difficulty: "4.2000",
      ease: 250,
      intervalDays: 7,
      learningStep: null,
      reviewCount: 5,
      lapseCount: 1,
    });
    expect(result.dueAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("falls back to the initial scheduling state when imported values are invalid", () => {
    const result = getImportedFlashcardSchedulingState({
      ...validFlashcard,
      dueAt: "not-a-date",
    });

    expect(result.state).toBe("new");
    expect(result.reviewCount).toBe(0);
    expect(result.lapseCount).toBe(0);
    expect(result.intervalDays).toBe(0);
  });
});
