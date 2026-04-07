import { describe, expect, it } from "vitest";
import {
  formatReviewPreviewDuration,
  getFlashcardReviewPreviewLabels,
} from "@/features/flashcard-review/preview";
import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewSchedulerSettings,
} from "@/lib/server/api-contracts";

function makeCard(
  overrides: Partial<FlashcardReviewEntity> = {},
): FlashcardReviewEntity {
  return {
    id: "card-1",
    front: "<p>Front</p>",
    back: "<p>Back</p>",
    subjectId: "subject-1",
    state: "new",
    dueAt: new Date("2026-03-04T12:00:00.000Z"),
    stability: null,
    difficulty: null,
    ease: 250,
    intervalDays: 0,
    learningStep: 0,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    deckId: null,
    ...overrides,
  };
}

const scheduler: FlashcardReviewSchedulerSettings = {
  desiredRetention: 0.9,
  weights: getDefaultFsrsWeights(),
};

describe("formatReviewPreviewDuration", () => {
  it("formats minute, hour, and day ranges compactly", () => {
    const now = new Date("2026-03-04T12:00:00.000Z");

    expect(
      formatReviewPreviewDuration(new Date("2026-03-04T12:10:00.000Z"), now),
    ).toBe("10m");
    expect(
      formatReviewPreviewDuration(new Date("2026-03-04T15:00:00.000Z"), now),
    ).toBe("3h");
    expect(
      formatReviewPreviewDuration(new Date("2026-03-06T12:00:00.000Z"), now),
    ).toBe("2d");
  });
});

describe("getFlashcardReviewPreviewLabels", () => {
  it("builds preview labels for a new card", () => {
    const now = new Date("2026-03-04T12:00:00.000Z");
    const labels = getFlashcardReviewPreviewLabels({
      card: makeCard(),
      scheduler,
      now,
    });

    expect(labels.again).toEqual({
      grade: "again",
      state: "learning",
      durationText: "1m",
    });
    expect(labels.good).toEqual({
      grade: "good",
      state: "learning",
      durationText: "10m",
    });
    expect(labels.easy.state).toBe("review");
  });

  it("matches the FSRS review-state transitions for a review card", () => {
    const now = new Date("2026-03-04T12:00:00.000Z");
    const labels = getFlashcardReviewPreviewLabels({
      card: makeCard({
        state: "review",
        stability: "10.0000",
        difficulty: "5.0000",
        intervalDays: 10,
        learningStep: 0,
        lastReviewedAt: new Date("2026-02-22T12:00:00.000Z"),
        reviewCount: 10,
      }),
      scheduler,
      now,
    });

    expect(labels.again).toEqual({
      grade: "again",
      state: "relearning",
      durationText: "10m",
    });
    expect(labels.hard).toEqual({
      grade: "hard",
      state: "review",
      durationText: "25d",
    });
    expect(labels.good.state).toBe("review");
    expect(labels.easy.state).toBe("review");
  });
});
