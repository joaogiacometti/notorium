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
const sqlMock = vi.fn((strings, ...values) => ({
  strings,
  values,
  mapWith: () => ({ strings, values }),
}));
const getDescendantSubjectIdsMock = vi.fn();
const getSubjectPathRowsForUserMock = vi.fn();
const readFsrsSettingsMock = vi.fn();

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

vi.mock("@/features/subjects/queries", () => ({
  getSubjectPathRowsForUser: getSubjectPathRowsForUserMock,
  getDescendantSubjectIds: getDescendantSubjectIdsMock,
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
    subjectId: "flashcard_subject_id_column",
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
    subjectId: "flashcard_review_log_subject_id_column",
  },
  subject: {
    id: "subject_id_column",
    userId: "subject_user_id_column",
    name: "subject_name_column",
    archivedAt: "subject_archived_at_column",
  },
}));

vi.mock("@/features/flashcards/fsrs/settings-queries", () => ({
  readFsrsSettings: readFsrsSettingsMock,
}));

function mockReviewTrendOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      where: () => ({
        groupBy: () => ({
          orderBy: vi.fn().mockResolvedValue(value),
        }),
      }),
    }),
  }));
}

describe("getFlashcardReviewActivityForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectMock.mockReset();
    getDescendantSubjectIdsMock.mockResolvedValue(["deck-1", "deck-1-child"]);
    getSubjectPathRowsForUserMock.mockResolvedValue([]);
    readFsrsSettingsMock.mockResolvedValue({
      desiredRetention: "0.9",
      weights: [],
    });
  });

  it("returns the trailing-year heatmap and streaks for the user", async () => {
    mockReviewTrendOnce([
      { date: "2026-04-08", count: 3 },
      { date: "2026-04-10", count: 5 },
      { date: "2026-04-12", count: 2 },
    ]);

    const { getFlashcardReviewActivityForUser } = await import("./queries");
    const result = await getFlashcardReviewActivityForUser(
      "user-1",
      new Date("2026-04-12T15:00:00.000Z"),
    );

    expect(eqMock).toHaveBeenCalledWith(
      "flashcard_review_log_user_id_column",
      "user-1",
    );
    expect(gteMock).toHaveBeenCalledWith(
      "flashcard_review_log_reviewed_at_column",
      expect.any(Date),
    );
    const expectedHeatmapStart = new Date("2026-04-12T15:00:00.000Z");
    expectedHeatmapStart.setHours(0, 0, 0, 0);
    expectedHeatmapStart.setDate(expectedHeatmapStart.getDate() - 364);

    expect(
      (
        vi.mocked(gteMock).mock.calls[0]?.[1] as Date | undefined
      )?.toISOString(),
    ).toBe(expectedHeatmapStart.toISOString());

    expect(result.heatmap).toHaveLength(365);
    expect(result.heatmap.at(-1)).toEqual({ date: "2026-04-12", count: 2 });
    expect(result.heatmap.filter((point) => point.count > 0)).toEqual([
      { date: "2026-04-08", count: 3 },
      { date: "2026-04-10", count: 5 },
      { date: "2026-04-12", count: 2 },
    ]);
    expect(result.streak).toEqual({ current: 1, longest: 1 });
  });

  it("returns a zero-filled heatmap when there are no reviews", async () => {
    mockReviewTrendOnce([]);

    const { getFlashcardReviewActivityForUser } = await import("./queries");
    const result = await getFlashcardReviewActivityForUser(
      "user-1",
      new Date("2026-04-12T15:00:00.000Z"),
    );

    expect(result.heatmap).toHaveLength(365);
    expect(result.heatmap.every((point) => point.count === 0)).toBe(true);
    expect(result.streak).toEqual({ current: 0, longest: 0 });
  });
});

describe("getFlashcardReviewStateForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectMock.mockReset();
    getDescendantSubjectIdsMock.mockResolvedValue(["deck-1", "deck-1-child"]);
    getSubjectPathRowsForUserMock.mockResolvedValue([
      { id: "deck-1", path: "Deck 1" },
      { id: "deck-1-child", path: "Deck 1::Child" },
    ]);
    readFsrsSettingsMock.mockResolvedValue({
      desiredRetention: "0.9",
      weights: [["w", 1]],
    });
  });

  it("returns deck-scoped due cards and summary for a due new flashcard", async () => {
    selectMock.mockImplementation((selection) => {
      if ("total" in selection) {
        return {
          from: () => ({
            where: vi.fn().mockResolvedValue([{ total: 3, due: 1 }]),
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
                      subjectId: "deck-1",
                      dueAt: new Date("2026-04-12T14:00:00.000Z"),
                      front: "Front",
                      back: "Back",
                      state: "new",
                      createdAt: new Date("2026-04-12T13:00:00.000Z"),
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
                    subjectName: "Deck 1",
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
      subjectId: "deck-1",
      limit: 50,
    });

    expect(result.summary).toEqual({
      dueCount: 1,
      totalCount: 3,
    });
    expect(selectMock).toHaveBeenCalledTimes(2);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({
      id: "flashcard-1",
      subjectId: "deck-1",
      subjectName: "Deck 1",
      subjectPath: "Deck 1",
      state: "new",
    });
    expect(result.scheduler).toEqual({
      desiredRetention: "0.9",
      weights: [["w", 1]],
    });
    expect(getDescendantSubjectIdsMock).toHaveBeenCalledWith(
      "user-1",
      "deck-1",
    );
    expect(inArrayMock).toHaveBeenCalledWith("flashcard_subject_id_column", [
      "deck-1",
      "deck-1-child",
    ]);
    expect(getDescendantSubjectIdsMock).toHaveBeenCalledTimes(1);
  });

  it("bounds the due filter by the learn-ahead cutoff so the dueAt index range applies", async () => {
    const now = new Date("2026-04-12T14:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: vi.fn().mockResolvedValue([{ total: 0, due: 0 }]),
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({ limit: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
    }));

    const { getFlashcardReviewStateForUser } = await import("./queries");
    await getFlashcardReviewStateForUser("user-1");

    expect(lteMock).toHaveBeenCalledWith(
      "flashcard_due_at_column",
      new Date("2026-04-12T14:20:00.000Z"),
    );
    expect(lteMock).toHaveBeenCalledWith("flashcard_due_at_column", now);
    expect(inArrayMock).toHaveBeenCalledWith("flashcard_state_column", [
      "learning",
      "relearning",
    ]);
    vi.useRealTimers();
  });
});
