import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({
  where: updateWhereMock,
}));
const updateMock = vi.fn(() => ({
  set: updateSetMock,
}));
const eqMock = vi.fn((column, value) => ({ column, value }));
const andMock = vi.fn((...conditions) => conditions);
const countMock = vi.fn(() => "count_column");
const optimizeFsrsParametersMock = vi.fn();
const shouldOptimizeFsrsParametersMock = vi.fn();
const tryAcquireUserExpiringLockMock = vi.fn();

vi.mock("@/db/index", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  count: countMock,
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    userId: "flashcard_user_id_column",
  },
  flashcardReviewLog: {
    userId: "flashcard_review_log_user_id_column",
    reviewedAt: "flashcard_review_log_reviewed_at_column",
  },
  flashcardSchedulerSettings: {
    userId: "flashcard_scheduler_settings_user_id_column",
    id: "flashcard_scheduler_settings_id_column",
  },
}));

vi.mock("@/features/flashcards/fsrs-optimizer", () => ({
  optimizeFsrsParameters: optimizeFsrsParametersMock,
  shouldOptimizeFsrsParameters: shouldOptimizeFsrsParametersMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  tryAcquireUserExpiringLock: tryAcquireUserExpiringLockMock,
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

function mockSelectOrderByOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      where: () => ({
        orderBy: vi.fn().mockResolvedValue(value),
      }),
    }),
  }));
}

describe("ensureFsrsSettings", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("falls back to default scheduler values when persisted settings are invalid", async () => {
    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "Infinity",
        weights: "{bad json",
        optimizedReviewCount: 0,
      },
    ]);

    const { ensureFsrsSettings } = await import(
      "@/features/flashcards/fsrs-settings"
    );
    const { getDefaultFsrsDesiredRetention, getDefaultFsrsWeights } =
      await import("@/features/flashcards/fsrs");

    const result = await ensureFsrsSettings("user-1");

    expect(result.desiredRetention).toBe(getDefaultFsrsDesiredRetention());
    expect(result.weights).toEqual(getDefaultFsrsWeights());
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
      "@/features/flashcards/fsrs-settings"
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

describe("maybeOptimizeFsrsParameters", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("skips optimization when the lock is not acquired", async () => {
    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "0.900",
        weights: "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]",
        optimizedReviewCount: 64,
      },
    ]);
    mockSelectWhereOnce([{ total: 96 }]);
    shouldOptimizeFsrsParametersMock.mockReturnValueOnce(true);
    tryAcquireUserExpiringLockMock.mockResolvedValueOnce(false);

    const { maybeOptimizeFsrsParameters } = await import(
      "@/features/flashcards/fsrs-settings"
    );

    await maybeOptimizeFsrsParameters("user-1");

    expect(optimizeFsrsParametersMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates stored weights when optimization returns new parameters", async () => {
    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "0.900",
        weights: "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]",
        optimizedReviewCount: 64,
      },
    ]);
    mockSelectWhereOnce([{ total: 96 }]);
    mockSelectOrderByOnce([
      {
        flashcardId: "card-1",
        rating: "good",
        daysElapsed: 1,
        reviewedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    shouldOptimizeFsrsParametersMock.mockReturnValueOnce(true);
    tryAcquireUserExpiringLockMock.mockResolvedValueOnce(true);
    optimizeFsrsParametersMock.mockResolvedValueOnce([1, 2, 3]);

    const { maybeOptimizeFsrsParameters } = await import(
      "@/features/flashcards/fsrs-settings"
    );

    await maybeOptimizeFsrsParameters("user-1");

    expect(optimizeFsrsParametersMock).toHaveBeenCalled();
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        weights: "[1,2,3]",
        optimizedReviewCount: 96,
        lastOptimizedAt: expect.any(Date),
      }),
    );
    expect(updateWhereMock).toHaveBeenCalled();
  });
});
