import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultFsrsDesiredRetention,
  getDefaultFsrsWeights,
  getInitialFlashcardSchedulingState,
  isFsrsSchedulerSettingsValid,
  scheduleFlashcardReview,
  serializeFsrsWeights,
} from "@/features/flashcards/fsrs";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

const now = new Date("2026-03-04T12:00:00.000Z");

type SchedulerCard = Pick<
  FlashcardEntity,
  | "state"
  | "dueAt"
  | "stability"
  | "difficulty"
  | "ease"
  | "intervalDays"
  | "learningStep"
  | "lastReviewedAt"
  | "reviewCount"
  | "lapseCount"
>;

function makeCard(overrides: Partial<SchedulerCard> = {}): SchedulerCard {
  return {
    state: "new",
    dueAt: now,
    stability: null,
    difficulty: null,
    ease: 250,
    intervalDays: 0,
    learningStep: 0,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    ...overrides,
  };
}

describe("getInitialFlashcardSchedulingState", () => {
  it("creates a new-due card ready for FSRS scheduling", () => {
    const result = getInitialFlashcardSchedulingState(now);

    expect(result).toEqual({
      state: "new",
      dueAt: now,
      stability: "0.0000",
      difficulty: "0.0000",
      ease: 250,
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
  it("moves a new card into learning on again", () => {
    const result = scheduleFlashcardReview({
      card: makeCard(),
      grade: "again",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("learning");
    expect(result.stability).toBe("0.2120");
    expect(result.difficulty).toBe("6.4133");
    expect(result.learningStep).toBe(0);
    expect(result.reviewCount).toBe(1);
    expect(result.dueAt.toISOString()).toBe("2026-03-04T12:01:00.000Z");
  });

  it("graduates a learning card with FSRS review timing", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({
        state: "learning",
        stability: "2.3065",
        difficulty: "2.1181",
        learningStep: 1,
        lastReviewedAt: now,
        reviewCount: 1,
      }),
      grade: "good",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(2);
    expect(result.difficulty).toBe("2.1112");
    expect(result.reviewCount).toBe(2);
    expect(result.dueAt.toISOString()).toBe("2026-03-06T12:00:00.000Z");
  });

  it("applies FSRS long-term scheduling for hard on a review card", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({
        state: "review",
        dueAt: now,
        stability: "10.0000",
        difficulty: "5.0000",
        intervalDays: 10,
        learningStep: 0,
        lastReviewedAt: new Date("2026-02-22T12:00:00.000Z"),
        reviewCount: 10,
      }),
      grade: "hard",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(23);
    expect(result.stability).toBe("23.2469");
    expect(result.difficulty).toBe("6.6660");
    expect(result.reviewCount).toBe(11);
    expect(result.daysElapsed).toBe(10);
    expect(result.dueAt.toISOString()).toBe("2026-03-27T12:00:00.000Z");
  });

  it("moves a failed review card into relearning", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({
        state: "review",
        dueAt: now,
        stability: "10.0000",
        difficulty: "5.0000",
        intervalDays: 10,
        learningStep: 0,
        lastReviewedAt: new Date("2026-02-22T12:00:00.000Z"),
        reviewCount: 10,
      }),
      grade: "again",
      now,
      enableFuzz: false,
    });

    expect(result.state).toBe("relearning");
    expect(result.intervalDays).toBe(0);
    expect(result.stability).toBe("1.3920");
    expect(result.difficulty).toBe("8.3418");
    expect(result.lapseCount).toBe(1);
    expect(result.dueAt.toISOString()).toBe("2026-03-04T12:10:00.000Z");
  });

  it("falls back to now when persisted review dates are invalid", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({
        state: "review",
        dueAt: new Date("invalid"),
        stability: "10.0000",
        difficulty: "5.0000",
        intervalDays: 10,
        learningStep: 0,
        lastReviewedAt: new Date("invalid"),
        reviewCount: 10,
      }),
      grade: "good",
      now,
      enableFuzz: false,
    });

    expect(Number.isNaN(result.dueAt.getTime())).toBe(false);
    expect(Number.isNaN(result.lastReviewedAt.getTime())).toBe(false);
  });

  it("sanitizes invalid persisted numeric scheduling state", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({
        state: "review",
        dueAt: now,
        stability: "NaN",
        difficulty: "NaN",
        intervalDays: Number.NaN,
        learningStep: Number.NaN,
        lastReviewedAt: now,
        reviewCount: Number.NaN,
        lapseCount: Number.NaN,
      }),
      grade: "good",
      now,
      enableFuzz: false,
    });

    expect(result.stability).not.toBe("NaN");
    expect(result.difficulty).not.toBe("NaN");
    expect(Number.isNaN(result.intervalDays)).toBe(false);
    expect(Number.isNaN(result.learningStep ?? 0)).toBe(false);
    expect(Number.isNaN(result.reviewCount)).toBe(false);
    expect(Number.isNaN(result.lapseCount)).toBe(false);
  });

  it("uses canonical new-card scheduling even with stale persisted fields", () => {
    const clean = scheduleFlashcardReview({
      card: makeCard({
        state: "new",
        intervalDays: 0,
        learningStep: 0,
        reviewCount: 0,
        lapseCount: 0,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
      }),
      grade: "easy",
      now,
      enableFuzz: false,
    });

    const stale = scheduleFlashcardReview({
      card: makeCard({
        state: "new",
        intervalDays: 400,
        learningStep: 9,
        reviewCount: 120,
        lapseCount: 12,
        stability: "99.9999",
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
    unstableWeights[3] = 500;

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
    vi.doUnmock("ts-fsrs");
    vi.resetModules();
  });

  it("returns false and caches probe failures when scheduler construction throws", async () => {
    vi.resetModules();

    const fsrsFactoryMock = vi.fn(() => {
      throw new Error("scheduler init failed");
    });

    vi.doMock("ts-fsrs", async (importOriginal) => {
      const actual = await importOriginal<typeof import("ts-fsrs")>();

      return {
        ...actual,
        fsrs: fsrsFactoryMock,
      };
    });

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
    expect(fsrsFactoryMock).toHaveBeenCalledTimes(1);
  });
});

describe("serializeFsrsWeights", () => {
  it("serializes provided weights without implicit normalization", () => {
    expect(serializeFsrsWeights([1, 2, 3])).toBe("[1,2,3]");
  });
});
