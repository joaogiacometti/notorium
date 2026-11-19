import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const andMock = vi.fn((...conditions) => conditions);
const ascMock = vi.fn((value) => value);
const countMock = vi.fn(() => "count_column");
const eqMock = vi.fn((column, value) => ({ column, value }));
const gteMock = vi.fn((column, value) => ({ column, operator: "gte", value }));
const gtMock = vi.fn((column, value) => ({ column, operator: "gt", value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const isNullMock = vi.fn((column) => ({ column, operator: "isNull" }));
const lteMock = vi.fn((column, value) => ({ column, operator: "lte", value }));
const orMock = vi.fn((...conditions) => conditions);
const notMock = vi.fn((condition) => ({ operator: "not", condition }));
const sqlMock = vi.fn((strings, ...values) => ({
  strings,
  values,
  mapWith: () => ({ strings, values }),
}));
const getDescendantFolderIdsMock = vi.fn();
const getFolderPathRowsForUserMock = vi.fn();
const readFsrsSettingsMock = vi.fn();
const remainingNewCardsMock = vi.fn();
const newCardAllowanceMock = vi.fn();

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
  gt: gtMock,
  gte: gteMock,
  inArray: inArrayMock,
  isNull: isNullMock,
  lte: lteMock,
  not: notMock,
  or: orMock,
  sql: sqlMock,
}));

vi.mock("@/features/folders/queries", () => ({
  getFolderPathMapForUser: async (userId: string) => {
    const rows: Array<{ id: string; path: string }> =
      await getFolderPathRowsForUserMock(userId);
    return new Map(rows.map((row) => [row.id, row.path]));
  },
  getDescendantFolderIds: getDescendantFolderIdsMock,
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
    folderId: "flashcard_folder_id_column",
    dueAt: "flashcard_due_at_column",
    reviewCount: "flashcard_review_count_column",
    lapseCount: "flashcard_lapse_count_column",
    state: "flashcard_state_column",
    createdAt: "flashcard_created_at_column",
    studyLaterAt: "flashcard_study_later_at_column",
    archivedAt: "flashcard_archived_at_column",
  },
  flashcardReviewLog: {
    userId: "flashcard_review_log_user_id_column",
    flashcardId: "flashcard_review_log_flashcard_id_column",
    rating: "flashcard_review_log_rating_column",
    reviewedAt: "flashcard_review_log_reviewed_at_column",
    folderId: "flashcard_review_log_folder_id_column",
  },
  folder: {
    id: "folder_id_column",
    userId: "folder_user_id_column",
    name: "folder_name_column",
    archivedAt: "folder_archived_at_column",
  },
}));

vi.mock("@/features/flashcards/fsrs/settings-queries", () => ({
  readFsrsSettings: readFsrsSettingsMock,
}));

vi.mock("@/features/flashcard-review/new-card-limit", async (importActual) => ({
  ...(await importActual<
    typeof import("@/features/flashcard-review/new-card-limit")
  >()),
  getRemainingNewCardsForToday: remainingNewCardsMock,
  getNewCardAllowanceForToday: newCardAllowanceMock,
}));

function mockReviewTrendOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      where: () => ({
        groupBy: vi.fn().mockResolvedValue(value),
      }),
    }),
  }));
}

describe("getFlashcardReviewActivityForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectMock.mockReset();
    getDescendantFolderIdsMock.mockResolvedValue(["deck-1", "deck-1-child"]);
    getFolderPathRowsForUserMock.mockResolvedValue([]);
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
      "UTC",
    );

    expect(eqMock).toHaveBeenCalledWith(
      "flashcard_review_log_user_id_column",
      "user-1",
    );
    expect(gteMock).toHaveBeenCalledWith(
      "flashcard_review_log_reviewed_at_column",
      expect.any(Date),
    );
    expect(result.heatmap).toHaveLength(365);
    expect(result.heatmap[0].date).toBe("2025-04-13");
    expect(result.heatmap.at(-1)).toEqual({ date: "2026-04-12", count: 2 });
    expect(result.heatmap.filter((point) => point.count > 0)).toEqual([
      { date: "2026-04-08", count: 3 },
      { date: "2026-04-10", count: 5 },
      { date: "2026-04-12", count: 2 },
    ]);
    expect(result.streak).toEqual({ current: 1, longest: 1 });
  });

  it("ends the heatmap on the user’s local day across the spring DST transition", async () => {
    mockReviewTrendOnce([{ date: "2026-03-08", count: 2 }]);
    const { getFlashcardReviewActivityForUser } = await import("./queries");
    const result = await getFlashcardReviewActivityForUser(
      "user-1",
      new Date("2026-03-09T03:30:00Z"),
      "America/New_York",
    );

    expect(result.heatmap.at(-1)).toEqual({ date: "2026-03-08", count: 2 });
    expect(result.streak.current).toBe(1);
  });

  it("returns a zero-filled heatmap when there are no reviews", async () => {
    mockReviewTrendOnce([]);

    const { getFlashcardReviewActivityForUser } = await import("./queries");
    const result = await getFlashcardReviewActivityForUser(
      "user-1",
      new Date("2026-04-12T15:00:00.000Z"),
      "UTC",
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
    getDescendantFolderIdsMock.mockResolvedValue(["deck-1", "deck-1-child"]);
    getFolderPathRowsForUserMock.mockResolvedValue([
      { id: "deck-1", path: "Deck 1" },
      { id: "deck-1-child", path: "Deck 1::Child" },
    ]);
    readFsrsSettingsMock.mockResolvedValue({
      desiredRetention: "0.9",
      weights: [["w", 1]],
      newCardsPerDay: 20,
    });
    // Zero keeps the queue query free of the allowed-new-cards subquery.
    remainingNewCardsMock.mockResolvedValue(0);
  });

  it("returns deck-scoped due cards and summary for a due new flashcard", async () => {
    selectMock.mockImplementation((selection) => {
      if ("total" in selection) {
        return {
          from: () => ({
            where: vi
              .fn()
              .mockResolvedValue([{ total: 3, dueStarted: 1, dueNew: 0 }]),
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
                      folderId: "deck-1",
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
                    folderName: "Deck 1",
                  },
                ]),
              }),
            }),
          }),
        }),
      };
    });

    const { getFlashcardReviewStateForUser } = await import("./queries");
    const result = await getFlashcardReviewStateForUser("user-1", "UTC", {
      folderId: "deck-1",
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
      folderId: "deck-1",
      folderName: "Deck 1",
      folderPath: "Deck 1",
      state: "new",
    });
    expect(result.scheduler).toEqual({
      desiredRetention: "0.9",
      weights: [["w", 1]],
    });
    expect(getDescendantFolderIdsMock).toHaveBeenCalledWith("user-1", "deck-1");
    expect(inArrayMock).toHaveBeenCalledWith("flashcard_folder_id_column", [
      "deck-1",
      "deck-1-child",
    ]);
    expect(getDescendantFolderIdsMock).toHaveBeenCalledTimes(1);
  });

  it("bounds the due filter by the learn-ahead cutoff so the dueAt index range applies", async () => {
    const now = new Date("2026-04-12T14:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: vi
          .fn()
          .mockResolvedValue([{ total: 0, dueStarted: 0, dueNew: 0 }]),
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({ limit: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
    }));

    const { getFlashcardReviewStateForUser } = await import("./queries");
    await getFlashcardReviewStateForUser("user-1", "UTC");

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

  it("orders study-later cards last and new cards between due and learn-ahead cards", async () => {
    const orderByMock = vi.fn(() => ({
      limit: vi.fn().mockResolvedValue([]),
    }));
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: vi
          .fn()
          .mockResolvedValue([{ total: 0, dueStarted: 0, dueNew: 0 }]),
        innerJoin: () => ({ where: () => ({ orderBy: orderByMock }) }),
      }),
    }));

    const { getFlashcardReviewStateForUser } = await import("./queries");
    await getFlashcardReviewStateForUser("user-1", "UTC");

    const [studyLaterTerm, groupTerm, dueAtTerm] = orderByMock.mock
      .calls[0] as unknown[];
    expect(studyLaterTerm).toMatchObject({
      values: ["flashcard_study_later_at_column"],
    });
    // Started cards due now, then new cards, then learn-ahead cards.
    expect(groupTerm).toMatchObject({
      values: [
        { column: "flashcard_state_column", value: "new" },
        { column: "flashcard_due_at_column", operator: "gt" },
      ],
    });
    expect(dueAtTerm).toBe("flashcard_due_at_column");
  });

  it("keeps archived cards out of the review queue, counts, and exams", async () => {
    const activeOnly = {
      column: "flashcard_archived_at_column",
      operator: "isNull",
    };
    const whereArgs: unknown[] = [];
    const recordWhere = (condition: unknown) => {
      whereArgs.push(condition);
    };
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: (condition: unknown) => {
          recordWhere(condition);
          return Promise.resolve([{ total: 0, dueStarted: 0, dueNew: 0 }]);
        },
        innerJoin: () => ({
          where: (condition: unknown) => {
            recordWhere(condition);
            return {
              orderBy: () =>
                Object.assign(Promise.resolve([]), {
                  limit: vi.fn().mockResolvedValue([]),
                }),
            };
          },
        }),
      }),
    }));

    const { getAllFlashcardsForExam, getFlashcardReviewStateForUser } =
      await import("./queries");
    await getFlashcardReviewStateForUser("user-1", "UTC");
    await getAllFlashcardsForExam("user-1");

    // Due batch, due/total counts, exam cards.
    expect(whereArgs).toHaveLength(3);
    for (const condition of whereArgs) {
      expect(JSON.stringify(condition)).toContain(JSON.stringify(activeOnly));
    }
  });
});

describe("getFlashcardReviewSummaryForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectMock.mockReset();
  });

  it("counts every due started card but only today's remaining new cards", async () => {
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: vi
          .fn()
          .mockResolvedValue([{ total: 40, dueStarted: 2, dueNew: 30 }]),
      }),
    }));
    newCardAllowanceMock.mockResolvedValue(5);
    const now = new Date("2026-04-12T15:00:00.000Z");

    const { getFlashcardReviewSummaryForUser } = await import("./queries");
    const summary = await getFlashcardReviewSummaryForUser(
      "user-1",
      now,
      "America/Sao_Paulo",
    );

    expect(summary).toEqual({ dueCount: 7, totalCount: 40 });
    expect(newCardAllowanceMock).toHaveBeenCalledWith(
      "user-1",
      now,
      "America/Sao_Paulo",
    );
  });
});
