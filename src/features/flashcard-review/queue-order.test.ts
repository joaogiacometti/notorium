import { describe, expect, it } from "vitest";
import {
  applyReviewedFlashcardToState,
  mergeFlashcardReviewStates,
  orderReviewQueue,
  setFlashcardStudyLaterInState,
} from "@/features/flashcard-review/state";
import type { FlashcardReviewState } from "@/lib/server/api-contracts";
import { makeReviewCard, makeReviewState } from "@/test/review-state";

describe("review queue order", () => {
  const markedAt = new Date("2026-03-07T11:30:00.000Z");
  const ids = (state: FlashcardReviewState) => state.cards.map((c) => c.id);

  it("puts a learning card due now ahead of new cards", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeReviewState(
      [makeReviewCard("new-1", new Date("2026-03-01T00:00:00.000Z"))],
      1,
    );

    const nextState = applyReviewedFlashcardToState(
      state,
      "card-1",
      makeReviewCard("card-1", new Date("2026-03-07T11:59:00.000Z"), {
        state: "relearning",
        learningStep: 0,
        reviewCount: 3,
      }),
      now,
    );

    expect(nextState.cards.map((card) => card.id)).toEqual(["card-1", "new-1"]);
  });

  it("keeps started cards from a refill ahead of new cards already queued", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const current = makeReviewState(
      [makeReviewCard("new-1", new Date("2026-03-01T00:00:00.000Z"))],
      2,
    );
    const incoming = makeReviewState(
      [
        makeReviewCard("review-1", new Date("2026-03-07T08:00:00.000Z"), {
          state: "review",
          reviewCount: 4,
        }),
      ],
      2,
    );

    const merged = mergeFlashcardReviewStates(current, incoming, now);

    expect(merged.cards.map((card) => card.id)).toEqual(["review-1", "new-1"]);
  });

  it("keeps study-later cards behind the others in their relative order", () => {
    const cards = [
      makeReviewCard("a", new Date("2026-03-07T10:00:00.000Z"), {
        studyLaterAt: markedAt,
      }),
      makeReviewCard("b", new Date("2026-03-07T11:00:00.000Z")),
      makeReviewCard("c", new Date("2026-03-07T09:00:00.000Z"), {
        studyLaterAt: markedAt,
      }),
      makeReviewCard("d", new Date("2026-03-07T12:00:00.000Z")),
    ];

    expect(
      orderReviewQueue(cards, new Date("2026-03-07T12:00:00.000Z")).map(
        (card) => card.id,
      ),
    ).toEqual(["b", "d", "a", "c"]);
  });

  it("moves a newly marked card to the end of the queue", () => {
    const state = makeReviewState(
      [
        makeReviewCard("a", new Date("2026-03-07T10:00:00.000Z")),
        makeReviewCard("b", new Date("2026-03-07T11:00:00.000Z")),
      ],
      2,
    );

    const next = setFlashcardStudyLaterInState(state, "a", markedAt);

    expect(ids(next)).toEqual(["b", "a"]);
    expect(next.cards[1].studyLaterAt).toEqual(markedAt);
    expect(next.summary).toEqual(state.summary);
  });

  it("clears a mark without moving the card", () => {
    const state = makeReviewState(
      [
        makeReviewCard("a", new Date("2026-03-07T10:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
        makeReviewCard("b", new Date("2026-03-07T11:00:00.000Z")),
      ],
      2,
    );

    const next = setFlashcardStudyLaterInState(state, "a", null);

    expect(ids(next)).toEqual(["a", "b"]);
    expect(next.cards[0].studyLaterAt).toBeNull();
  });

  it("re-queues a regraded unmarked card ahead of study-later cards", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeReviewState(
      [
        makeReviewCard("a", new Date("2026-03-07T11:00:00.000Z")),
        makeReviewCard("b", new Date("2026-03-07T10:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
      ],
      2,
    );

    const next = applyReviewedFlashcardToState(
      state,
      "a",
      makeReviewCard("a", new Date("2026-03-07T11:59:00.000Z"), {
        state: "learning",
        learningStep: 0,
      }),
      now,
    );

    expect(ids(next)).toEqual(["a", "b"]);
  });

  it("re-queues a regraded study-later card among the study-later cards", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeReviewState(
      [
        makeReviewCard("a", new Date("2026-03-07T11:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
        makeReviewCard("b", new Date("2026-03-07T11:59:30.000Z")),
        makeReviewCard("c", new Date("2026-03-07T11:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
      ],
      3,
    );

    const next = applyReviewedFlashcardToState(
      state,
      "a",
      makeReviewCard("a", new Date("2026-03-07T11:01:00.000Z"), {
        state: "learning",
        learningStep: 0,
        studyLaterAt: markedAt,
      }),
      now,
    );

    // Still behind every unmarked card; within study-later cards, a started
    // card due now comes before a new one.
    expect(ids(next)).toEqual(["b", "a", "c"]);
  });

  it("puts refilled cards ahead of study-later cards", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const current = makeReviewState(
      [
        makeReviewCard("a", new Date("2026-03-07T11:00:00.000Z")),
        makeReviewCard("b", new Date("2026-03-07T10:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
      ],
      3,
    );
    const incoming = makeReviewState(
      [makeReviewCard("c", new Date("2026-03-07T11:10:00.000Z"))],
      3,
    );

    const next = mergeFlashcardReviewStates(current, incoming, now);

    expect(ids(next)).toEqual(["a", "c", "b"]);
  });
});
