import { describe, expect, it } from "vitest";
import {
  dedupeQueuedReviewEvents,
  deserializeFlashcardReviewState,
  deserializeQueuedReviewEvent,
  getFlashcardReviewScopeKey,
  type QueuedFlashcardReviewEvent,
  serializeFlashcardReviewState,
  serializeQueuedReviewEvent,
  sortQueuedReviewEvents,
} from "@/features/flashcard-review/offline-store";
import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import type { FlashcardReviewState } from "@/lib/server/api-contracts";

function makeEvent(
  clientReviewId: string,
  reviewedAt: string,
): QueuedFlashcardReviewEvent {
  return {
    clientReviewId,
    flashcardId: `card-${clientReviewId}`,
    grade: "good",
    reviewedAt: new Date(reviewedAt),
  };
}

function makeState(): FlashcardReviewState {
  return {
    cards: [
      {
        id: "card-1",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
        deckId: "deck-1",
        state: "review",
        dueAt: new Date("2026-03-08T12:00:00.000Z"),
        stability: "10.0000",
        difficulty: "5.0000",
        ease: 250,
        intervalDays: 7,
        learningStep: 0,
        lastReviewedAt: new Date("2026-03-01T12:00:00.000Z"),
        reviewCount: 4,
        lapseCount: 0,
      },
    ],
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

describe("offline review store helpers", () => {
  it("builds stable scope keys", () => {
    expect(getFlashcardReviewScopeKey()).toBe("all");
    expect(getFlashcardReviewScopeKey("deck-1")).toBe("deck-1");
  });

  it("serializes and restores queued event dates", () => {
    const event = makeEvent("client-1", "2026-03-08T12:00:00.000Z");

    const restored = deserializeQueuedReviewEvent(
      serializeQueuedReviewEvent(event),
    );

    expect(restored).toEqual(event);
    expect(restored.reviewedAt).toBeInstanceOf(Date);
  });

  it("orders queued events chronologically", () => {
    const events = [
      makeEvent("client-2", "2026-03-08T12:02:00.000Z"),
      makeEvent("client-1", "2026-03-08T12:01:00.000Z"),
    ];

    expect(
      sortQueuedReviewEvents(events).map((event) => event.clientReviewId),
    ).toEqual(["client-1", "client-2"]);
  });

  it("dedupes queued events by first client id occurrence", () => {
    const events = [
      makeEvent("client-1", "2026-03-08T12:01:00.000Z"),
      makeEvent("client-1", "2026-03-08T12:02:00.000Z"),
      makeEvent("client-2", "2026-03-08T12:03:00.000Z"),
    ];

    expect(dedupeQueuedReviewEvents(events)).toEqual([events[0], events[2]]);
  });

  it("serializes and restores review state dates", () => {
    const state = makeState();

    const restored = deserializeFlashcardReviewState(
      serializeFlashcardReviewState(state),
    );

    expect(restored).toEqual(state);
    expect(restored.cards[0].dueAt).toBeInstanceOf(Date);
    expect(restored.cards[0].lastReviewedAt).toBeInstanceOf(Date);
  });
});
