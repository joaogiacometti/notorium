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
const isNullMock = vi.fn((column) => ({ isNull: column }));
const ltMock = vi.fn((column, value) => ({ column, value }));
const orMock = vi.fn((...conditions) => conditions);
const optimizeFsrsParametersMock = vi.fn();
const shouldOptimizeFsrsParametersMock = vi.fn();
const tryAcquireUserExpiringLockMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
    update: updateMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  count: countMock,
  eq: eqMock,
  isNull: isNullMock,
  lt: ltMock,
  or: orMock,
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
    automaticOptimizationEnabled:
      "flashcard_scheduler_settings_automatic_optimization_enabled_column",
    lastOptimizedAt: "flashcard_scheduler_settings_last_optimized_at_column",
  },
}));

vi.mock("@/features/flashcards/fsrs/optimizer", () => ({
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
      "@/features/flashcards/fsrs/settings"
    );
    const { getDefaultFsrsDesiredRetention, getDefaultFsrsWeights } =
      await import("@/features/flashcards/fsrs");

    const result = await ensureFsrsSettings("user-1");

    expect(result.desiredRetention).toBe(getDefaultFsrsDesiredRetention());
    expect(result.weights).toEqual(getDefaultFsrsWeights());
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        desiredRetention: getDefaultFsrsDesiredRetention().toFixed(3),
        weights: JSON.stringify(getDefaultFsrsWeights()),
        optimizedReviewCount: 0,
        lastOptimizedAt: null,
      }),
    );
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
      "@/features/flashcards/fsrs/settings"
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
      "@/features/flashcards/fsrs/settings"
    );

    await maybeOptimizeFsrsParameters("user-1");

    expect(optimizeFsrsParametersMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates stored weights when optimization returns new parameters", async () => {
    const { getDefaultFsrsWeights } = await import(
      "@/features/flashcards/fsrs"
    );
    const optimizedWeights = getDefaultFsrsWeights();

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
    optimizeFsrsParametersMock.mockResolvedValueOnce(optimizedWeights);

    const { maybeOptimizeFsrsParameters } = await import(
      "@/features/flashcards/fsrs/settings"
    );

    await maybeOptimizeFsrsParameters("user-1");

    expect(optimizeFsrsParametersMock).toHaveBeenCalled();
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        weights: JSON.stringify(optimizedWeights),
        optimizedReviewCount: 96,
        lastOptimizedAt: expect.any(Date),
      }),
    );
    expect(updateWhereMock).toHaveBeenCalled();
  });

  it("uses reset optimizedReviewCount immediately after invalid settings are normalized", async () => {
    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "Infinity",
        weights: "{bad json",
        optimizedReviewCount: 128,
      },
    ]);
    mockSelectWhereOnce([{ total: 96 }]);
    shouldOptimizeFsrsParametersMock.mockReturnValueOnce(false);

    const { maybeOptimizeFsrsParameters } = await import(
      "@/features/flashcards/fsrs/settings"
    );

    await maybeOptimizeFsrsParameters("user-1");

    expect(shouldOptimizeFsrsParametersMock).toHaveBeenCalledWith(96, 0);
  });

  it("skips optimizer results that fail scheduler validation", async () => {
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
      "@/features/flashcards/fsrs/settings"
    );

    await maybeOptimizeFsrsParameters("user-1");

    expect(optimizeFsrsParametersMock).toHaveBeenCalled();
    expect(updateSetMock).not.toHaveBeenCalled();
  });

  it("skips structurally valid optimizer results that are behaviorally unstable", async () => {
    const { getDefaultFsrsWeights } = await import(
      "@/features/flashcards/fsrs"
    );
    const unstableWeights = getDefaultFsrsWeights();
    unstableWeights[3] = 500;

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
    optimizeFsrsParametersMock.mockResolvedValueOnce(unstableWeights);

    const { maybeOptimizeFsrsParameters } = await import(
      "@/features/flashcards/fsrs/settings"
    );

    await maybeOptimizeFsrsParameters("user-1");

    expect(optimizeFsrsParametersMock).toHaveBeenCalled();
    expect(updateSetMock).not.toHaveBeenCalled();
  });
});

describe("optimizeFsrsParametersForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("runs manual optimization without the new-review batch threshold", async () => {
    const { getDefaultFsrsWeights } = await import(
      "@/features/flashcards/fsrs"
    );
    const optimizedWeights = getDefaultFsrsWeights();

    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "0.900",
        weights: JSON.stringify(optimizedWeights),
        optimizedReviewCount: 96,
        lastOptimizedAt: new Date("2026-01-01T00:00:00.000Z"),
        automaticOptimizationEnabled: false,
      },
    ]);
    mockSelectWhereOnce([{ total: 97 }]);
    mockSelectOrderByOnce([
      {
        flashcardId: "card-1",
        rating: "good",
        daysElapsed: 1,
        reviewedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    tryAcquireUserExpiringLockMock.mockResolvedValueOnce(true);
    optimizeFsrsParametersMock.mockResolvedValueOnce(optimizedWeights);

    const { optimizeFsrsParametersForUser } = await import(
      "@/features/flashcards/fsrs/settings"
    );

    const result = await optimizeFsrsParametersForUser("user-1");

    expect(result).toEqual({
      success: true,
      optimizedReviewCount: 97,
      lastOptimizedAt: expect.any(Date),
    });
    expect(shouldOptimizeFsrsParametersMock).not.toHaveBeenCalled();
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        weights: JSON.stringify(optimizedWeights),
        optimizedReviewCount: 97,
      }),
    );
  });

  it("returns a user-facing result when optimization lacks review history", async () => {
    const { getDefaultFsrsWeights } = await import(
      "@/features/flashcards/fsrs"
    );

    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "0.900",
        weights: JSON.stringify(getDefaultFsrsWeights()),
        optimizedReviewCount: 0,
        automaticOptimizationEnabled: false,
      },
    ]);
    mockSelectWhereOnce([{ total: 12 }]);
    mockSelectOrderByOnce([]);
    tryAcquireUserExpiringLockMock.mockResolvedValueOnce(true);
    optimizeFsrsParametersMock.mockResolvedValueOnce(null);

    const { optimizeFsrsParametersForUser } = await import(
      "@/features/flashcards/fsrs/settings"
    );

    const result = await optimizeFsrsParametersForUser("user-1");

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.fsrsOptimization.notEnoughHistory",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(updateSetMock).not.toHaveBeenCalled();
  });
});

describe("updateFsrsOptimizationPreferences", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("persists the automatic optimization flag on the user's settings", async () => {
    const { getDefaultFsrsWeights } = await import(
      "@/features/flashcards/fsrs"
    );

    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "0.900",
        weights: JSON.stringify(getDefaultFsrsWeights()),
        optimizedReviewCount: 0,
        automaticOptimizationEnabled: false,
      },
    ]);

    const { updateFsrsOptimizationPreferences } = await import(
      "@/features/flashcards/fsrs/settings"
    );

    await updateFsrsOptimizationPreferences("user-1", true);

    expect(updateSetMock).toHaveBeenCalledWith({
      automaticOptimizationEnabled: true,
    });
    expect(updateWhereMock).toHaveBeenCalled();
  });
});

describe("resetFsrsOptimizationForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("restores default weights and clears optimization metadata", async () => {
    const { getDefaultFsrsWeights } = await import(
      "@/features/flashcards/fsrs"
    );

    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "0.900",
        weights: JSON.stringify(
          getDefaultFsrsWeights().map((value) => value + 1),
        ),
        optimizedReviewCount: 96,
        lastOptimizedAt: new Date("2026-01-01T00:00:00.000Z"),
        automaticOptimizationEnabled: true,
      },
    ]);

    const { resetFsrsOptimizationForUser } = await import(
      "@/features/flashcards/fsrs/settings"
    );

    await resetFsrsOptimizationForUser("user-1");

    expect(updateSetMock).toHaveBeenCalledWith({
      weights: JSON.stringify(getDefaultFsrsWeights()),
      optimizedReviewCount: 0,
      lastOptimizedAt: null,
    });
    expect(eqMock).toHaveBeenCalledWith(
      "flashcard_scheduler_settings_user_id_column",
      "user-1",
    );
    expect(eqMock).toHaveBeenCalledWith(
      "flashcard_scheduler_settings_id_column",
      "settings-1",
    );
    expect(updateWhereMock).toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalledOnce();
  });
});

describe("optimizeAutomaticFsrsParameters", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("optimizes enabled users with stale optimization timestamps", async () => {
    const { getDefaultFsrsWeights } = await import(
      "@/features/flashcards/fsrs"
    );
    const optimizedWeights = getDefaultFsrsWeights();

    mockSelectWhereOnce([{ userId: "user-1" }]);
    mockSelectLimitOnce([
      {
        id: "settings-1",
        userId: "user-1",
        desiredRetention: "0.900",
        weights: JSON.stringify(optimizedWeights),
        optimizedReviewCount: 64,
        lastOptimizedAt: new Date("2026-01-01T00:00:00.000Z"),
        automaticOptimizationEnabled: true,
      },
    ]);
    mockSelectWhereOnce([{ total: 96 }]);
    mockSelectOrderByOnce([
      {
        flashcardId: "card-1",
        rating: "good",
        daysElapsed: 1,
        reviewedAt: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);
    tryAcquireUserExpiringLockMock.mockResolvedValueOnce(true);
    optimizeFsrsParametersMock.mockResolvedValueOnce(optimizedWeights);

    const { optimizeAutomaticFsrsParameters } = await import(
      "@/features/flashcards/fsrs/settings"
    );

    const result = await optimizeAutomaticFsrsParameters(
      new Date("2026-03-05T00:00:00.000Z"),
    );

    expect(ltMock).toHaveBeenCalledWith(
      "flashcard_scheduler_settings_last_optimized_at_column",
      new Date("2026-02-03T00:00:00.000Z"),
    );
    expect(result).toEqual({
      attempted: 1,
      optimized: 1,
      skipped: 0,
    });
  });
});
