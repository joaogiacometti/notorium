import { describe, expect, it, vi } from "vitest";
import { applyOfflineFlashcardReview } from "@/features/flashcard-review/offline-review";
import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

function makeCard(
  overrides: Partial<FlashcardReviewEntity> = {},
): FlashcardReviewEntity {
  return {
    id: "card-1",
    front: "<p>Front</p>",
    back: "<p>Back</p>",
    deckId: "deck-1",
    state: "new",
    dueAt: new Date("2026-03-08T12:00:00.000Z"),
    stability: null,
    difficulty: null,
    ease: 250,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    ...overrides,
  };
}

function makeState(card: FlashcardReviewEntity): FlashcardReviewState {
  return {
    cards: [card],
    summary: {
      dueCount: 1,
      totalCount: 1,
    },
    scheduler: {
      desiredRetention: 0.9,
      weights: getDefaultFsrsWeights(),
    },
  };
}

describe("applyOfflineFlashcardReview", () => {
  it("updates scheduling locally and removes a card that is no longer due", () => {
    vi.useFakeTimers();
    const reviewedAt = new Date("2026-03-08T12:00:00.000Z");
    vi.setSystemTime(reviewedAt);
    const card = makeCard();

    const nextState = applyOfflineFlashcardReview({
      state: makeState(card),
      card,
      grade: "easy",
      reviewedAt,
    });

    expect(nextState.cards).toEqual([]);
    expect(nextState.summary.dueCount).toBe(0);
    vi.useRealTimers();
  });
});
