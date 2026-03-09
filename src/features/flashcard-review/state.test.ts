import { describe, expect, it } from "vitest";
import {
  applyReviewedFlashcardToState,
  mergeFlashcardReviewStates,
  replaceFlashcardInReviewState,
  shouldRefillFlashcardReviewState,
} from "@/features/flashcard-review/state";
import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

const scheduler = {
  desiredRetention: 0.9,
  weights: getDefaultFsrsWeights(),
};

function makeCard(
  id: string,
  dueAt: Date,
  overrides: Partial<FlashcardReviewEntity> = {},
): FlashcardReviewEntity {
  return {
    id,
    front: `<p>${id} front</p>`,
    back: `<p>${id} back</p>`,
    subjectId: "subject-1",
    state: "new",
    dueAt,
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

function makeState(
  cards: FlashcardReviewEntity[],
  dueCount: number,
): FlashcardReviewState {
  return {
    cards,
    summary: {
      dueCount,
      totalCount: dueCount,
    },
    scheduler,
  };
}

describe("applyReviewedFlashcardToState", () => {
  it("removes the reviewed card and decrements the due count when the card is no longer due", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeState(
      [
        makeCard("card-1", new Date("2026-03-07T11:00:00.000Z")),
        makeCard("card-2", new Date("2026-03-07T11:05:00.000Z")),
      ],
      2,
    );

    const nextState = applyReviewedFlashcardToState(
      state,
      "card-1",
      makeCard("card-1", new Date("2026-03-07T12:10:00.000Z"), {
        state: "learning",
        learningStep: 0,
        reviewCount: 1,
      }),
      now,
    );

    expect(nextState).toEqual({
      cards: [makeCard("card-2", new Date("2026-03-07T11:05:00.000Z"))],
      summary: {
        dueCount: 1,
        totalCount: 2,
      },
      scheduler,
    });
  });

  it("re-inserts the reviewed card when it remains due immediately", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeState(
      [
        makeCard("card-1", new Date("2026-03-07T11:00:00.000Z")),
        makeCard("card-2", new Date("2026-03-07T11:05:00.000Z")),
      ],
      2,
    );

    const nextState = applyReviewedFlashcardToState(
      state,
      "card-1",
      makeCard("card-1", new Date("2026-03-07T11:02:00.000Z"), {
        state: "relearning",
        learningStep: 0,
        reviewCount: 1,
      }),
      now,
    );

    expect(nextState.summary).toEqual(state.summary);
    expect(nextState.cards.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
    ]);
  });
});

describe("mergeFlashcardReviewStates", () => {
  it("appends unique refill cards and replaces the summary", () => {
    const current = makeState(
      [
        makeCard("card-1", new Date("2026-03-07T11:00:00.000Z")),
        makeCard("card-2", new Date("2026-03-07T11:05:00.000Z")),
      ],
      4,
    );
    const incoming = {
      cards: [
        makeCard("card-2", new Date("2026-03-07T11:05:00.000Z")),
        makeCard("card-3", new Date("2026-03-07T11:10:00.000Z")),
      ],
      summary: {
        dueCount: 3,
        totalCount: 8,
      },
      scheduler,
    };

    const nextState = mergeFlashcardReviewStates(current, incoming);

    expect(nextState.cards.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
      "card-3",
    ]);
    expect(nextState.summary).toEqual(incoming.summary);
  });
});

describe("replaceFlashcardInReviewState", () => {
  it("replaces the matching card without changing queue order", () => {
    const state = makeState(
      [
        makeCard("card-1", new Date("2026-03-07T11:00:00.000Z")),
        makeCard("card-2", new Date("2026-03-07T11:05:00.000Z")),
      ],
      2,
    );

    const nextState = replaceFlashcardInReviewState(
      state,
      makeCard("card-1", new Date("2026-03-07T11:00:00.000Z"), {
        front: "<p>updated front</p>",
        back: "<p>updated back</p>",
      }),
    );

    expect(nextState.cards.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
    ]);
    expect(nextState.cards[0]?.front).toBe("<p>updated front</p>");
    expect(nextState.cards[0]?.back).toBe("<p>updated back</p>");
    expect(nextState.summary).toEqual(state.summary);
  });

  it("returns the current state when the flashcard is not in the queue", () => {
    const state = makeState(
      [makeCard("card-1", new Date("2026-03-07T11:00:00.000Z"))],
      1,
    );

    const nextState = replaceFlashcardInReviewState(
      state,
      makeCard("card-2", new Date("2026-03-07T11:05:00.000Z")),
    );

    expect(nextState).toBe(state);
  });
});

describe("shouldRefillFlashcardReviewState", () => {
  it("requests a refill only when the queue is low and more due cards exist on the server", () => {
    expect(
      shouldRefillFlashcardReviewState(
        makeState(
          [makeCard("card-1", new Date("2026-03-07T11:00:00.000Z"))],
          3,
        ),
      ),
    ).toBe(true);

    expect(
      shouldRefillFlashcardReviewState(
        makeState(
          [makeCard("card-1", new Date("2026-03-07T11:00:00.000Z"))],
          1,
        ),
      ),
    ).toBe(false);
  });
});
