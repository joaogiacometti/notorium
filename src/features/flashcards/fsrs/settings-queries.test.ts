import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
// Write spies stay unused by design: the read module must never call them.
const insertMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn((column, value) => ({ column, value }));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => "count_column"),
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  flashcardReviewLog: {
    userId: "flashcard_review_log_user_id_column",
    reviewedAt: "flashcard_review_log_reviewed_at_column",
  },
  flashcardSchedulerSettings: {
    userId: "flashcard_scheduler_settings_user_id_column",
  },
}));

function mockSelectLimitOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      where: () => ({
        limit: vi.fn().mockResolvedValue(value),
      }),
    }),
  }));
}

function mockSelectWhereOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      where: vi.fn().mockResolvedValue(value),
    }),
  }));
}

describe("readFsrsSettings", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns defaults without creating a row for a first-time user", async () => {
    mockSelectLimitOnce([]);

    const { readFsrsSettings } = await import(
      "@/features/flashcards/fsrs/settings-queries"
    );
    const { getDefaultFsrsDesiredRetention, getDefaultFsrsWeights } =
      await import("@/features/flashcards/fsrs");

    const result = await readFsrsSettings("user-1");

    expect(result).toEqual({
      desiredRetention: getDefaultFsrsDesiredRetention(),
      weights: getDefaultFsrsWeights(),
      optimizedReviewCount: 0,
      lastOptimizedAt: null,
      automaticOptimizationEnabled: false,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("normalizes invalid persisted values in memory without writing", async () => {
    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "Infinity",
        weights: "{bad json",
        optimizedReviewCount: 9,
        automaticOptimizationEnabled: true,
      },
    ]);

    const { readFsrsSettings } = await import(
      "@/features/flashcards/fsrs/settings-queries"
    );
    const { getDefaultFsrsWeights } = await import(
      "@/features/flashcards/fsrs"
    );

    const result = await readFsrsSettings("user-1");

    expect(result.weights).toEqual(getDefaultFsrsWeights());
    expect(result.optimizedReviewCount).toBe(0);
    expect(result.automaticOptimizationEnabled).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("getFsrsOptimizationSettings", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reads optimization settings without creating a row", async () => {
    mockSelectLimitOnce([]);
    mockSelectWhereOnce([{ total: 4 }]);

    const { getFsrsOptimizationSettings } = await import(
      "@/features/flashcards/fsrs/settings-queries"
    );

    const result = await getFsrsOptimizationSettings("user-1");

    expect(result).toEqual({
      automaticOptimizationEnabled: false,
      lastOptimizedAt: null,
      optimizedReviewCount: 0,
      reviewCount: 4,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("getFlashcardReviewLogsForOptimization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loads the full user review history without applying a limit", async () => {
    const orderBy = vi.fn().mockResolvedValue([]);
    selectMock.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          orderBy,
        }),
      }),
    }));

    const { getFlashcardReviewLogsForOptimization } = await import(
      "@/features/flashcards/fsrs/settings-queries"
    );

    await getFlashcardReviewLogsForOptimization("user-1");

    expect(eqMock).toHaveBeenCalledWith(
      "flashcard_review_log_user_id_column",
      "user-1",
    );
    expect(orderBy).toHaveBeenCalledWith(
      "flashcard_review_log_reviewed_at_column",
    );
  });
});
