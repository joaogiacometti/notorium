import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const andMock = vi.fn((...conditions) => conditions);
const ascMock = vi.fn((value) => value);
const countMock = vi.fn(() => "count_column");
const eqMock = vi.fn((column, value) => ({ column, value }));
const gteMock = vi.fn((column, value) => ({ column, operator: "gte", value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));
const lteMock = vi.fn((column, value) => ({ column, operator: "lte", value }));
const orMock = vi.fn((...conditions) => conditions);
const sqlMock = vi.fn((strings, ...values) => ({ strings, values }));
const getDescendantDeckIdsMock = vi.fn();
const getAllDecksWithPathsForUserMock = vi.fn();
const ensureFsrsSettingsMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  asc: ascMock,
  count: countMock,
  eq: eqMock,
  gte: gteMock,
  inArray: inArrayMock,
  isNull: isNullMock,
  lte: lteMock,
  or: orMock,
  sql: sqlMock,
}));

vi.mock("@/features/decks/queries", () => ({
  getAllDecksWithPathsForUser: getAllDecksWithPathsForUserMock,
  getDescendantDeckIds: getDescendantDeckIdsMock,
}));

vi.mock("@/db/schema", () => ({
  deck: {
    id: "deck_id_column",
    name: "deck_name_column",
  },
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
    subjectId: "flashcard_subject_id_column",
    deckId: "flashcard_deck_id_column",
    dueAt: "flashcard_due_at_column",
    reviewCount: "flashcard_review_count_column",
    lapseCount: "flashcard_lapse_count_column",
    state: "flashcard_state_column",
    createdAt: "flashcard_created_at_column",
  },
  flashcardReviewLog: {
    userId: "flashcard_review_log_user_id_column",
    flashcardId: "flashcard_review_log_flashcard_id_column",
    rating: "flashcard_review_log_rating_column",
    reviewedAt: "flashcard_review_log_reviewed_at_column",
  },
  subject: {
    id: "subject_id_column",
    userId: "subject_user_id_column",
    name: "subject_name_column",
    archivedAt: "subject_archived_at_column",
  },
}));

vi.mock("@/features/flashcards/fsrs-settings", () => ({
  ensureFsrsSettings: ensureFsrsSettingsMock,
}));

function mockFlashcardWhereOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      innerJoin: () => ({
        where: vi.fn().mockResolvedValue(value),
      }),
    }),
  }));
}

function mockFlashcardGroupByOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      innerJoin: () => ({
        where: () => ({
          groupBy: vi.fn().mockResolvedValue(value),
        }),
      }),
    }),
  }));
}

function mockReviewGroupByOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      innerJoin: () => ({
        innerJoin: () => ({
          where: () => ({
            groupBy: vi.fn().mockResolvedValue(value),
          }),
        }),
      }),
    }),
  }));
}

function mockReviewTrendOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      innerJoin: () => ({
        innerJoin: () => ({
          where: () => ({
            groupBy: () => ({
              orderBy: vi.fn().mockResolvedValue(value),
            }),
          }),
        }),
      }),
    }),
  }));
}

describe("getFlashcardStatisticsForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectMock.mockReset();
    getDescendantDeckIdsMock.mockResolvedValue(["deck-1", "deck-1-child"]);
    getAllDecksWithPathsForUserMock.mockResolvedValue([]);
    ensureFsrsSettingsMock.mockResolvedValue({
      desiredRetention: "0.9",
      weights: [],
    });
  });

  it("returns aggregated statistics for the scoped flashcards", async () => {
    mockFlashcardWhereOnce([
      {
        totalCards: 6,
        dueCards: 2,
        reviewedCards: 4,
        totalReviews: 18,
        totalLapses: 5,
      },
    ]);
    mockFlashcardGroupByOnce([
      { state: "new", count: 2 },
      { state: "review", count: 3 },
      { state: "relearning", count: 1 },
    ]);
    mockReviewGroupByOnce([
      { rating: "again", count: 2 },
      { rating: "good", count: 9 },
      { rating: "easy", count: 7 },
    ]);
    mockReviewTrendOnce([
      { date: "2026-04-08", count: 3 },
      { date: "2026-04-10", count: 5 },
      { date: "2026-04-12", count: 2 },
    ]);

    const { getFlashcardStatisticsForUser } = await import("./queries");
    const result = await getFlashcardStatisticsForUser(
      "user-1",
      new Date("2026-04-12T15:00:00.000Z"),
      {
        deckId: "deck-1",
      },
    );

    expect(result.summary).toEqual({
      totalCards: 6,
      dueCards: 2,
      reviewedCards: 4,
      neverReviewedCards: 2,
      totalReviews: 18,
      totalLapses: 5,
      averageReviewsPerCard: 3,
      averageLapsesPerReviewedCard: 1.25,
    });
    expect(result.states).toEqual([
      { key: "new", label: "New", count: 2 },
      { key: "learning", label: "Learning", count: 0 },
      { key: "review", label: "Review", count: 3 },
      { key: "relearning", label: "Relearning", count: 1 },
    ]);
    expect(result.ratings).toEqual([
      { key: "again", label: "Again", count: 2 },
      { key: "hard", label: "Hard", count: 0 },
      { key: "good", label: "Good", count: 9 },
      { key: "easy", label: "Easy", count: 7 },
    ]);
    expect(result.trend).toEqual([
      { date: "2026-04-06", count: 0 },
      { date: "2026-04-07", count: 0 },
      { date: "2026-04-08", count: 3 },
      { date: "2026-04-09", count: 0 },
      { date: "2026-04-10", count: 5 },
      { date: "2026-04-11", count: 0 },
      { date: "2026-04-12", count: 2 },
    ]);
    expect(getDescendantDeckIdsMock).toHaveBeenCalledWith("user-1", "deck-1");
    expect(inArrayMock).toHaveBeenCalledWith("flashcard_deck_id_column", [
      "deck-1",
      "deck-1-child",
    ]);
    expect(eqMock).toHaveBeenCalledWith(
      "flashcard_review_log_user_id_column",
      "user-1",
    );
    expect(gteMock).toHaveBeenCalledWith(
      "flashcard_review_log_reviewed_at_column",
      expect.any(Date),
    );
    const expectedTrendStart = new Date("2026-04-12T15:00:00.000Z");
    expectedTrendStart.setHours(0, 0, 0, 0);
    expectedTrendStart.setDate(expectedTrendStart.getDate() - 6);

    expect(
      (
        vi.mocked(gteMock).mock.calls[0]?.[1] as Date | undefined
      )?.toISOString(),
    ).toBe(expectedTrendStart.toISOString());
  });

  it("returns zeroed statistics when no cards are in scope", async () => {
    mockFlashcardWhereOnce([
      {
        totalCards: 0,
        dueCards: 0,
        reviewedCards: 0,
        totalReviews: 0,
        totalLapses: 0,
      },
    ]);
    mockFlashcardGroupByOnce([]);
    mockReviewGroupByOnce([]);
    mockReviewTrendOnce([]);

    const { getFlashcardStatisticsForUser } = await import("./queries");
    const result = await getFlashcardStatisticsForUser(
      "user-1",
      new Date("2026-04-12T15:00:00.000Z"),
    );

    expect(result.summary).toEqual({
      totalCards: 0,
      dueCards: 0,
      reviewedCards: 0,
      neverReviewedCards: 0,
      totalReviews: 0,
      totalLapses: 0,
      averageReviewsPerCard: 0,
      averageLapsesPerReviewedCard: 0,
    });
    expect(result.trend).toEqual([
      { date: "2026-04-06", count: 0 },
      { date: "2026-04-07", count: 0 },
      { date: "2026-04-08", count: 0 },
      { date: "2026-04-09", count: 0 },
      { date: "2026-04-10", count: 0 },
      { date: "2026-04-11", count: 0 },
      { date: "2026-04-12", count: 0 },
    ]);
  });
});

describe("getFlashcardReviewStateForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectMock.mockReset();
    getDescendantDeckIdsMock.mockResolvedValue(["deck-1", "deck-1-child"]);
    getAllDecksWithPathsForUserMock.mockResolvedValue([
      { id: "deck-1", path: "Deck 1" },
      { id: "deck-1-child", path: "Deck 1::Child" },
    ]);
    ensureFsrsSettingsMock.mockResolvedValue({
      desiredRetention: "0.9",
      weights: [["w", 1]],
    });
  });

  it("returns deck-scoped due cards and summary for a due new flashcard", async () => {
    selectMock.mockImplementation((selection) => {
      if ("total" in selection) {
        return {
          from: () => ({
            where: vi.fn().mockResolvedValue([{ total: 1 }]),
          }),
        };
      }

      return {
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    flashcard: {
                      id: "flashcard-1",
                      deckId: "deck-1",
                      dueAt: new Date("2026-04-12T14:00:00.000Z"),
                      front: "Front",
                      back: "Back",
                      state: "new",
                      createdAt: new Date("2026-04-12T13:00:00.000Z"),
                      ease: 250,
                      intervalDays: 0,
                      learningStep: null,
                      lastReviewedAt: null,
                      reviewCount: 0,
                      lapseCount: 0,
                      stability: null,
                      difficulty: null,
                      userId: "user-1",
                      updatedAt: new Date("2026-04-12T13:00:00.000Z"),
                      frontNormalized: "front",
                    },
                    deckName: "Deck 1",
                  },
                ]),
              }),
            }),
          }),
        }),
      };
    });

    const { getFlashcardReviewStateForUser } = await import("./queries");
    const result = await getFlashcardReviewStateForUser("user-1", {
      deckId: "deck-1",
      limit: 50,
    });

    expect(result.summary).toEqual({
      dueCount: 1,
      totalCount: 1,
    });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({
      id: "flashcard-1",
      deckId: "deck-1",
      deckName: "Deck 1",
      deckPath: "Deck 1",
      state: "new",
    });
    expect(result.scheduler).toEqual({
      desiredRetention: "0.9",
      weights: [["w", 1]],
    });
    expect(getDescendantDeckIdsMock).toHaveBeenCalledWith("user-1", "deck-1");
    expect(inArrayMock).toHaveBeenCalledWith("flashcard_deck_id_column", [
      "deck-1",
      "deck-1-child",
    ]);
  });
});
