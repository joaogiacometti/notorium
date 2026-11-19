import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  getInitialFlashcardSchedulingState,
  isFsrsSchedulerSettingsValid,
  scheduleFlashcardReview,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";

const now = new Date("2026-03-04T12:00:00.000Z");

type SchedulerCard = Parameters<typeof scheduleFlashcardReview>[0]["card"];

const dayMs = 24 * 60 * 60 * 1000;

function makeCard(overrides: Partial<SchedulerCard> = {}): SchedulerCard {
  return {
    id: "card-1",
    state: "new",
    dueAt: now,
    stability: null,
    stabilityFast: null,
    difficulty: null,
    intervalDays: 0,
    learningStep: 0,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    ...overrides,
  };
}

function makeReviewCard(overrides: Partial<SchedulerCard> = {}) {
  return makeCard({
    state: "review",
    stability: "10.0000",
    stabilityFast: "8.0000",
    difficulty: "5.0000",
    intervalDays: 10,
    lastReviewedAt: new Date(now.getTime() - 10 * dayMs),
    reviewCount: 10,
    ...overrides,
  });
}

describe("getInitialFlashcardSchedulingState", () => {
  it("creates a new-due card with an empty FSRS-7 memory", () => {
    const result = getInitialFlashcardSchedulingState(now);

    expect(result).toEqual({
      state: "new",
      dueAt: now,
      stability: "0.0000",
      stabilityFast: "0.0000",
      difficulty: "0.0000",
      intervalDays: 0,
      learningStep: 0,
      lastReviewedAt: null,
      reviewCount: 0,
      lapseCount: 0,
      updatedAt: now,
    });
  });
});

describe("scheduleFlashcardReview", () => {
  it("keeps a new card in its first learning step on again", () => {
    const result = scheduleFlashcardReview({
      card: makeCard(),
      grade: "again",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("learning");
    expect(result.reviewCount).toBe(1);
    expect(result.dueAt.toISOString()).toBe("2026-03-04T12:01:00.000Z");
    expect(Number(result.stabilityFast)).toBeGreaterThan(0);
  });

  it("lets the model skip learning steps when it predicts a longer interval", () => {
    const result = scheduleFlashcardReview({
      card: makeCard(),
      grade: "good",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("review");
    expect(result.intervalDays).toBeGreaterThan(1);
  });

  it("schedules fractional sub-day intervals inside learning", () => {
    const result = scheduleFlashcardReview({
      card: makeCard(),
      grade: "hard",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("learning");
    expect(result.intervalDays).toBeGreaterThan(0);
    expect(result.intervalDays).toBeLessThan(1);
    expect(result.dueAt.getTime() - now.getTime()).toBeCloseTo(
      result.intervalDays * dayMs,
      -1,
    );
  });

  it("extends a review card's interval on hard and updates both traces", () => {
    const card = makeReviewCard();
    const result = scheduleFlashcardReview({
      card,
      grade: "hard",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("review");
    expect(result.intervalDays).toBeGreaterThan(card.intervalDays);
    expect(result.stability).not.toBe(card.stability);
    expect(result.stabilityFast).not.toBe(card.stabilityFast);
    expect(result.reviewCount).toBe(11);
    expect(result.lastReviewedAt).toEqual(now);
  });

  it("moves a failed review card into relearning", () => {
    const result = scheduleFlashcardReview({
      card: makeReviewCard(),
      grade: "again",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("relearning");
    expect(result.intervalDays).toBeLessThan(1);
    expect(result.lapseCount).toBe(1);
  });

  it("refuses a learned card without a fast trace instead of inventing one", () => {
    expect(() =>
      scheduleFlashcardReview({
        card: makeReviewCard({ stabilityFast: null }),
        grade: "good",
        now,
      }),
    ).toThrow("stabilityFast");
  });

  it("fuzzes the same card review identically on every run", () => {
    const schedule = (id: string) =>
      scheduleFlashcardReview({
        card: makeReviewCard({ id }),
        grade: "good",
        now,
      }).dueAt.toISOString();

    expect(schedule("card-a")).toBe(schedule("card-a"));
  });

  it("falls back to now when persisted review dates are invalid", () => {
    const result = scheduleFlashcardReview({
      card: makeReviewCard({
        dueAt: new Date("invalid"),
        lastReviewedAt: new Date("invalid"),
      }),
      grade: "good",
      now,
      enableFuzz: false,
    });

    expect(Number.isNaN(result.dueAt.getTime())).toBe(false);
    expect(result.lastReviewedAt).toEqual(now);
  });

  it("sanitizes invalid persisted counters", () => {
    const result = scheduleFlashcardReview({
      card: makeReviewCard({
        intervalDays: Number.NaN,
        learningStep: Number.NaN,
        reviewCount: Number.NaN,
        lapseCount: Number.NaN,
      }),
      grade: "good",
      now,
      enableFuzz: false,
    });

    expect(Number.isNaN(result.intervalDays)).toBe(false);
    expect(Number.isNaN(result.learningStep)).toBe(false);
    expect(result.reviewCount).toBe(1);
    expect(result.lapseCount).toBe(0);
  });

  it("uses canonical new-card scheduling even with stale persisted fields", () => {
    const clean = scheduleFlashcardReview({
      card: makeCard(),
      grade: "easy",
      now,
      enableFuzz: false,
    });

    const stale = scheduleFlashcardReview({
      card: makeCard({
        intervalDays: 400,
        learningStep: 9,
        reviewCount: 120,
        lapseCount: 12,
        stability: "99.9999",
        stabilityFast: "99.9999",
        difficulty: "1.0000",
        lastReviewedAt: new Date("2025-01-01T12:00:00.000Z"),
      }),
      grade: "easy",
      now,
      enableFuzz: false,
    });

    expect(stale.intervalDays).toBe(clean.intervalDays);
    expect(stale.dueAt.toISOString()).toBe(clean.dueAt.toISOString());
    expect(stale.state).toBe(clean.state);
  });
});

describe("isFsrsSchedulerSettingsValid", () => {
  it("accepts default scheduler settings", () => {
    expect(
      isFsrsSchedulerSettingsValid({
        desiredRetention: getDefaultFsrsDesiredRetention(),
        weights: getDefaultFsrsWeights(),
      }),
    ).toBe(true);
  });

  it("rejects obviously unstable scheduler weights", () => {
    const unstableWeights = getDefaultFsrsWeights();
    // Easy initial stability far beyond the new-card easy interval limit.
    unstableWeights[3] = 100;

    expect(
      isFsrsSchedulerSettingsValid({
        desiredRetention: getDefaultFsrsDesiredRetention(),
        weights: unstableWeights,
      }),
    ).toBe(false);
  });

  it("rejects invalid desired retention values", () => {
    expect(
      isFsrsSchedulerSettingsValid({
        desiredRetention: 0,
        weights: getDefaultFsrsWeights(),
      }),
    ).toBe(false);
    expect(
      isFsrsSchedulerSettingsValid({
        desiredRetention: 1,
        weights: getDefaultFsrsWeights(),
      }),
    ).toBe(false);
    expect(
      isFsrsSchedulerSettingsValid({
        desiredRetention: Number.NaN,
        weights: getDefaultFsrsWeights(),
      }),
    ).toBe(false);
  });
});

describe("isFsrsSchedulerSettingsValid exception handling", () => {
  afterEach(() => {
    vi.doUnmock("@/features/flashcards/fsrs/definition");
    vi.resetModules();
  });

  it("returns false and caches probe failures when scheduler construction throws", async () => {
    vi.resetModules();

    const createSchedulerMock = vi.fn(() => {
      throw new Error("scheduler init failed");
    });

    vi.doMock(
      "@/features/flashcards/fsrs/definition",
      async (importOriginal) => ({
        ...(await importOriginal<
          typeof import("@/features/flashcards/fsrs/definition")
        >()),
        createScheduler: createSchedulerMock,
      }),
    );

    const {
      getDefaultFsrsDesiredRetention,
      getDefaultFsrsWeights,
      isFsrsSchedulerSettingsValid,
    } = await import("@/features/flashcards/fsrs");

    const validationInput = {
      desiredRetention: getDefaultFsrsDesiredRetention(),
      weights: getDefaultFsrsWeights(),
    };

    expect(isFsrsSchedulerSettingsValid(validationInput)).toBe(false);
    expect(isFsrsSchedulerSettingsValid(validationInput)).toBe(false);
    expect(createSchedulerMock).toHaveBeenCalledTimes(1);
  });
});

describe("serializeFsrsWeights", () => {
  it("serializes provided weights without implicit normalization", () => {
    expect(serializeFsrsWeights([1, 2, 3])).toBe("[1,2,3]");
  });
});
