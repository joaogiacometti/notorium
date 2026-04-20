import { describe, expect, it } from "vitest";
import {
  isCardDueWithLearnAhead,
  LEARN_AHEAD_WINDOW_MS,
} from "@/features/flashcard-review/constants";
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
    deckId: "deck-1",
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
  it("removes the reviewed card and decrements the due count when a review card is not yet due", () => {
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
      makeCard("card-1", new Date("2026-03-08T12:00:00.000Z"), {
        state: "review",
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

  it("re-inserts a learning card within the 20-min learn-ahead window instead of dropping it", () => {
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

    expect(nextState.summary).toEqual(state.summary);
    expect(nextState.cards.map((card) => card.id)).toEqual([
      "card-2",
      "card-1",
    ]);
  });

  it("drops a learning card scheduled beyond the 20-min window and decrements due count", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeState(
      [makeCard("card-1", new Date("2026-03-07T11:00:00.000Z"))],
      1,
    );

    const nextState = applyReviewedFlashcardToState(
      state,
      "card-1",
      makeCard("card-1", new Date("2026-03-07T12:21:00.000Z"), {
        state: "learning",
        learningStep: 0,
        reviewCount: 1,
      }),
      now,
    );

    expect(nextState.cards).toEqual([]);
    expect(nextState.summary.dueCount).toBe(0);
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

  it("preserves cards added by a concurrent refill when removing the reviewed card", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeState(
      [
        makeCard("card-1", new Date("2026-03-07T11:00:00.000Z")),
        makeCard("card-2", new Date("2026-03-07T11:05:00.000Z")),
        makeCard("card-3", new Date("2026-03-07T11:10:00.000Z")),
      ],
      3,
    );

    const nextState = applyReviewedFlashcardToState(
      state,
      "card-1",
      makeCard("card-1", new Date("2026-03-07T12:25:00.000Z"), {
        state: "review",
        learningStep: 0,
        reviewCount: 1,
      }),
      now,
    );

    expect(nextState.cards.map((card) => card.id)).toEqual([
      "card-2",
      "card-3",
    ]);
    expect(nextState.summary).toEqual({
      dueCount: 2,
      totalCount: 3,
    });
  });
});

describe("mergeFlashcardReviewStates", () => {
  it("appends unique refill cards and recalculates dueCount based on merged cards", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
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

    const nextState = mergeFlashcardReviewStates(current, incoming, now);

    expect(nextState.cards.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
      "card-3",
    ]);
    expect(nextState.summary.dueCount).toBe(3);
    expect(nextState.summary.totalCount).toBe(8);
  });

  it("prevents race condition by recalculating dueCount when server returns empty cards but non-zero summary", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const current = makeState([], 0);
    const incoming = {
      cards: [],
      summary: {
        dueCount: 5,
        totalCount: 10,
      },
      scheduler,
    };

    const nextState = mergeFlashcardReviewStates(current, incoming, now);

    expect(nextState.cards).toEqual([]);
    expect(nextState.summary.dueCount).toBe(0);
    expect(nextState.summary.totalCount).toBe(10);
  });

  it("counts a learning card within the 20-min window as due when merging", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const current = makeState([], 0);
    const incoming = {
      cards: [
        makeCard("card-1", new Date("2026-03-07T12:10:00.000Z"), {
          state: "learning",
        }),
        makeCard("card-2", new Date("2026-03-07T14:00:00.000Z"), {
          state: "learning",
        }),
      ],
      summary: { dueCount: 2, totalCount: 2 },
      scheduler,
    };

    const nextState = mergeFlashcardReviewStates(current, incoming, now);

    expect(nextState.cards.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
    ]);
    expect(nextState.summary.dueCount).toBe(1);
  });

  it("correctly counts only due cards when some cards are not yet due", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const current = makeState(
      [makeCard("card-1", new Date("2026-03-07T11:00:00.000Z"))],
      3,
    );
    const incoming = {
      cards: [
        makeCard("card-2", new Date("2026-03-07T11:30:00.000Z")),
        makeCard("card-3", new Date("2026-03-07T13:00:00.000Z")),
      ],
      summary: {
        dueCount: 3,
        totalCount: 5,
      },
      scheduler,
    };

    const nextState = mergeFlashcardReviewStates(current, incoming, now);

    expect(nextState.cards.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
      "card-3",
    ]);
    expect(nextState.summary.dueCount).toBe(2);
    expect(nextState.summary.totalCount).toBe(5);
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

describe("isCardDueWithLearnAhead", () => {
  const now = new Date("2026-03-07T12:00:00.000Z");

  it("returns true when dueAt is in the past", () => {
    const card = makeCard("c", new Date("2026-03-07T11:00:00.000Z"), {
      state: "new",
    });
    expect(isCardDueWithLearnAhead(card, now)).toBe(true);
  });

  it("returns true when dueAt equals now", () => {
    const card = makeCard("c", now, { state: "review" });
    expect(isCardDueWithLearnAhead(card, now)).toBe(true);
  });

  it("returns false for a new card with dueAt in the future beyond now", () => {
    const card = makeCard("c", new Date(now.getTime() + 1), { state: "new" });
    expect(isCardDueWithLearnAhead(card, now)).toBe(false);
  });

  it("returns false for a review card with dueAt in the future even within 20 min", () => {
    const card = makeCard("c", new Date(now.getTime() + 10 * 60 * 1000), {
      state: "review",
    });
    expect(isCardDueWithLearnAhead(card, now)).toBe(false);
  });

  it("returns true for a learning card with dueAt within the 20-min window", () => {
    const card = makeCard("c", new Date(now.getTime() + 10 * 60 * 1000), {
      state: "learning",
    });
    expect(isCardDueWithLearnAhead(card, now)).toBe(true);
  });

  it("returns true for a relearning card with dueAt at the exact 20-min boundary", () => {
    const card = makeCard(
      "c",
      new Date(now.getTime() + LEARN_AHEAD_WINDOW_MS),
      { state: "relearning" },
    );
    expect(isCardDueWithLearnAhead(card, now)).toBe(true);
  });

  it("returns false for a learning card with dueAt 1ms past the 20-min boundary", () => {
    const card = makeCard(
      "c",
      new Date(now.getTime() + LEARN_AHEAD_WINDOW_MS + 1),
      { state: "learning" },
    );
    expect(isCardDueWithLearnAhead(card, now)).toBe(false);
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
