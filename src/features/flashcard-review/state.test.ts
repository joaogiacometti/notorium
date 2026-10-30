import { describe, expect, it } from "vitest";
import {
  isCardDueWithLearnAhead,
  LEARN_AHEAD_WINDOW_MS,
} from "@/features/flashcard-review/constants";
import {
  applyReviewedFlashcardToState,
  excludeFlashcardsFromFetchedState,
  gradeFlashcardLocally,
  mergeFlashcardReviewStates,
  orderStudyLaterLast,
  removeFlashcardsFromReviewState,
  replaceFlashcardInReviewState,
  restoreFlashcardToFront,
  scheduleGradeAt,
  setFlashcardStudyLaterInState,
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
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    studyLaterAt: null,
    subjectId: "deck-1",
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
  it("appends unique refill cards without losing the server's total due count", () => {
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

  it("preserves a non-zero server due count when a page is temporarily empty", () => {
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
    expect(nextState.summary.dueCount).toBe(5);
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
    expect(nextState.summary.dueCount).toBe(2);
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
    expect(nextState.summary.dueCount).toBe(3);
    expect(nextState.summary.totalCount).toBe(5);
  });

  it("keeps hidden due cards discoverable after merging a limited refill page", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const current = makeState(
      [makeCard("card-1", new Date("2026-03-07T11:00:00.000Z"))],
      51,
    );
    const incoming = makeState(
      Array.from({ length: 50 }, (_, index) =>
        makeCard(
          `card-${index + 1}`,
          new Date(`2026-03-07T11:${String(index).padStart(2, "0")}:00.000Z`),
        ),
      ),
      51,
    );

    const nextState = mergeFlashcardReviewStates(current, incoming, now);

    expect(nextState.cards).toHaveLength(50);
    expect(nextState.summary.dueCount).toBe(51);
    expect(shouldRefillFlashcardReviewState(nextState, 50)).toBe(true);
  });
});

describe("replaceFlashcardInReviewState", () => {
  it("retains source metadata after content or scheduling updates, while honoring explicit removal", () => {
    const source = {
      kind: "note" as const,
      id: "n1",
      title: "Cells",
      subjectId: "biology",
    };
    const card = {
      id: "c1",
      source,
    } as import("@/lib/server/api-contracts").FlashcardReviewEntity;
    const state = {
      cards: [card],
      summary: { dueCount: 1, totalCount: 1 },
      scheduler: { desiredRetention: 0.9, weights: [] },
    };
    const update = {
      id: "c1",
      back: "Edited",
    } as import("@/lib/server/api-contracts").FlashcardReviewEntity;
    expect(
      replaceFlashcardInReviewState(state, update).cards[0].source,
    ).toEqual(source);
    expect(
      replaceFlashcardInReviewState(state, { ...update, source: null }).cards[0]
        .source,
    ).toBeNull();
  });

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

describe("removeFlashcardsFromReviewState", () => {
  it("drops the cards and lowers both counts without going negative", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state: FlashcardReviewState = {
      cards: [makeCard("a", now), makeCard("b", now), makeCard("c", now)],
      summary: { dueCount: 1, totalCount: 5 },
      scheduler,
    };

    const next = removeFlashcardsFromReviewState(state, ["a", "c"]);

    expect(next.cards.map((card) => card.id)).toEqual(["b"]);
    expect(next.summary).toEqual({ dueCount: 0, totalCount: 3 });
    expect(next.scheduler).toBe(scheduler);
  });
});

describe("scheduleGradeAt", () => {
  it("schedules a learn-ahead review from the card's due time", () => {
    const dueAt = new Date("2026-03-07T12:10:00.000Z");
    const card = makeCard("a", dueAt, {
      state: "learning",
      stability: "0.2120",
      difficulty: "6.4133",
      learningStep: 1,
      lastReviewedAt: new Date("2026-03-07T12:00:00.000Z"),
      reviewCount: 1,
    });

    const early = scheduleGradeAt({
      card,
      grade: "good",
      scheduler,
      reviewedAt: new Date("2026-03-07T12:02:00.000Z"),
    });
    const onTime = scheduleGradeAt({
      card,
      grade: "good",
      scheduler,
      reviewedAt: dueAt,
    });

    expect(early.dueAt).toEqual(onTime.dueAt);
  });
});

describe("gradeFlashcardLocally", () => {
  it("returns the card with its next schedule and the actual review time", () => {
    const reviewedAt = new Date("2026-03-07T12:00:00.000Z");
    const card = makeCard("a", new Date("2026-03-07T11:00:00.000Z"), {
      subjectName: "Biology",
      subjectPath: "Science::Biology",
    });

    const graded = gradeFlashcardLocally(card, "good", scheduler, reviewedAt);
    const expected = scheduleGradeAt({
      card,
      grade: "good",
      scheduler,
      reviewedAt,
    });

    expect(graded).toMatchObject({
      id: "a",
      front: card.front,
      subjectPath: "Science::Biology",
      state: expected.state,
      dueAt: expected.dueAt,
      reviewCount: 1,
      lastReviewedAt: reviewedAt,
    });
  });
});

describe("restoreFlashcardToFront", () => {
  const now = new Date("2026-03-07T12:00:00.000Z");

  it("puts a removed card back first and restores the due count", () => {
    const original = makeCard("a", now);
    const state = makeState([makeCard("b", now)], 1);

    const next = restoreFlashcardToFront(state, original);

    expect(next.cards.map((card) => card.id)).toEqual(["a", "b"]);
    expect(next.cards[0]).toBe(original);
    expect(next.summary.dueCount).toBe(2);
  });

  it("replaces a requeued copy without counting it twice", () => {
    const original = makeCard("a", now);
    const requeued = makeCard("a", new Date("2026-03-07T12:10:00.000Z"), {
      state: "learning",
    });
    const state = makeState([makeCard("b", now), requeued], 2);

    const next = restoreFlashcardToFront(state, original);

    expect(next.cards).toEqual([original, makeCard("b", now)]);
    expect(next.summary.dueCount).toBe(2);
  });
});

describe("excludeFlashcardsFromFetchedState", () => {
  it("drops excluded cards and lowers only the due count", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state: FlashcardReviewState = {
      cards: [makeCard("a", now), makeCard("b", now)],
      summary: { dueCount: 2, totalCount: 9 },
      scheduler,
    };

    const next = excludeFlashcardsFromFetchedState(
      state,
      new Set(["a", "missing"]),
    );

    expect(next.cards.map((card) => card.id)).toEqual(["b"]);
    expect(next.summary).toEqual({ dueCount: 1, totalCount: 9 });
  });
});

describe("study later ordering", () => {
  const markedAt = new Date("2026-03-07T11:30:00.000Z");
  const ids = (state: FlashcardReviewState) => state.cards.map((c) => c.id);

  it("keeps study-later cards behind the others in their relative order", () => {
    const cards = [
      makeCard("a", new Date("2026-03-07T10:00:00.000Z"), {
        studyLaterAt: markedAt,
      }),
      makeCard("b", new Date("2026-03-07T11:00:00.000Z")),
      makeCard("c", new Date("2026-03-07T09:00:00.000Z"), {
        studyLaterAt: markedAt,
      }),
      makeCard("d", new Date("2026-03-07T12:00:00.000Z")),
    ];

    expect(orderStudyLaterLast(cards).map((card) => card.id)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });

  it("moves a newly marked card to the end of the queue", () => {
    const state = makeState(
      [
        makeCard("a", new Date("2026-03-07T10:00:00.000Z")),
        makeCard("b", new Date("2026-03-07T11:00:00.000Z")),
      ],
      2,
    );

    const next = setFlashcardStudyLaterInState(state, "a", markedAt);

    expect(ids(next)).toEqual(["b", "a"]);
    expect(next.cards[1].studyLaterAt).toEqual(markedAt);
    expect(next.summary).toEqual(state.summary);
  });

  it("clears a mark without moving the card", () => {
    const state = makeState(
      [
        makeCard("a", new Date("2026-03-07T10:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
        makeCard("b", new Date("2026-03-07T11:00:00.000Z")),
      ],
      2,
    );

    const next = setFlashcardStudyLaterInState(state, "a", null);

    expect(ids(next)).toEqual(["a", "b"]);
    expect(next.cards[0].studyLaterAt).toBeNull();
  });

  it("re-queues a regraded unmarked card ahead of study-later cards", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeState(
      [
        makeCard("a", new Date("2026-03-07T11:00:00.000Z")),
        makeCard("b", new Date("2026-03-07T10:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
      ],
      2,
    );

    const next = applyReviewedFlashcardToState(
      state,
      "a",
      makeCard("a", new Date("2026-03-07T11:59:00.000Z"), {
        state: "learning",
        learningStep: 0,
      }),
      now,
    );

    expect(ids(next)).toEqual(["a", "b"]);
  });

  it("re-queues a regraded study-later card among the study-later cards", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const state = makeState(
      [
        makeCard("a", new Date("2026-03-07T11:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
        makeCard("b", new Date("2026-03-07T11:59:30.000Z")),
        makeCard("c", new Date("2026-03-07T11:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
      ],
      3,
    );

    const next = applyReviewedFlashcardToState(
      state,
      "a",
      makeCard("a", new Date("2026-03-07T11:01:00.000Z"), {
        state: "learning",
        learningStep: 0,
        studyLaterAt: markedAt,
      }),
      now,
    );

    expect(ids(next)).toEqual(["b", "c", "a"]);
  });

  it("puts refilled cards ahead of study-later cards", () => {
    const now = new Date("2026-03-07T12:00:00.000Z");
    const current = makeState(
      [
        makeCard("a", new Date("2026-03-07T11:00:00.000Z")),
        makeCard("b", new Date("2026-03-07T10:00:00.000Z"), {
          studyLaterAt: markedAt,
        }),
      ],
      3,
    );
    const incoming = makeState(
      [makeCard("c", new Date("2026-03-07T11:10:00.000Z"))],
      3,
    );

    const next = mergeFlashcardReviewStates(current, incoming, now);

    expect(ids(next)).toEqual(["a", "c", "b"]);
  });
});
