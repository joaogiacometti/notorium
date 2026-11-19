import { describe, expect, it } from "vitest";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  getInitialFlashcardSchedulingState,
  scheduleFlashcardReview,
} from "@/features/flashcards/fsrs";
import { createScheduler } from "@/features/flashcards/fsrs/definition";
import { rebuildFlashcardMemory } from "@/features/flashcards/fsrs/memory-rebuild";
import type { ReviewGrade } from "@/features/flashcards/fsrs/types";

const scheduler = createScheduler({
  desiredRetention: getDefaultFsrsDesiredRetention(),
  weights: getDefaultFsrsWeights(),
  enableFuzz: false,
});

const reviews: { rating: ReviewGrade; reviewedAt: Date }[] = [
  { rating: "good", reviewedAt: new Date("2026-01-01T00:00:00.000Z") },
  { rating: "again", reviewedAt: new Date("2026-01-06T00:00:00.000Z") },
  { rating: "good", reviewedAt: new Date("2026-01-06T00:20:00.000Z") },
  { rating: "easy", reviewedAt: new Date("2026-01-09T08:00:00.000Z") },
];

function cardAfter(history: typeof reviews) {
  return {
    id: "card-1",
    reviewCount: history.length,
    lastReviewedAt: history.at(-1)?.reviewedAt ?? null,
  };
}

describe("rebuildFlashcardMemory", () => {
  it("rebuilds the same memory the scheduler reaches by reviewing the history", () => {
    let card = {
      id: "card-1",
      ...getInitialFlashcardSchedulingState(reviews[0]?.reviewedAt),
    };
    for (const review of reviews) {
      card = {
        ...card,
        ...scheduleFlashcardReview({
          card,
          grade: review.rating,
          now: review.reviewedAt,
          enableFuzz: false,
        }),
      };
    }

    const rebuilt = rebuildFlashcardMemory(
      scheduler,
      cardAfter(reviews),
      reviews,
    );

    // Stored memory is rounded to four decimals after every review, while the
    // replay keeps full precision, so both agree up to that rounding drift.
    expect(rebuilt.ok).toBe(true);
    if (!rebuilt.ok) return;
    for (const field of ["stability", "stabilityFast", "difficulty"] as const) {
      expect(Number(rebuilt.memory[field])).toBeCloseTo(Number(card[field]), 2);
    }
  });

  it("replays only the reviews since the card's latest reset", () => {
    const sinceReset = reviews.slice(2);

    expect(
      rebuildFlashcardMemory(scheduler, cardAfter(sinceReset), reviews),
    ).toEqual(
      rebuildFlashcardMemory(scheduler, cardAfter(sinceReset), sinceReset),
    );
  });

  it("refuses a card with fewer logged reviews than its review count", () => {
    expect(
      rebuildFlashcardMemory(
        scheduler,
        { ...cardAfter(reviews), reviewCount: 5 },
        reviews,
      ),
    ).toEqual({ ok: false, reason: "missingHistory" });
  });

  it("refuses a history that does not end at the card's last review", () => {
    expect(
      rebuildFlashcardMemory(
        scheduler,
        {
          ...cardAfter(reviews),
          lastReviewedAt: new Date("2026-02-01T00:00:00.000Z"),
        },
        reviews,
      ),
    ).toEqual({ ok: false, reason: "historyMismatch" });
  });
});
