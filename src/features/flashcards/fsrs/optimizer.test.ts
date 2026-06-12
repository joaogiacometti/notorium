import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  optimizeFsrsParameters,
  shouldOptimizeFsrsParameters,
} from "@/features/flashcards/fsrs/optimizer";
import type { FlashcardReviewLogEntity } from "@/lib/server/api-contracts";

// Mock the WASM binding so tests verify data-preparation logic, not the
// optimizer algorithm. The real WASM is tested via the API route integration.
const computeParametersMock = vi.fn();

class MockFSRSBindingReview {
  constructor(
    public readonly rating: number,
    public readonly deltaT: number,
  ) {}
}

class MockFSRSBindingItem {
  constructor(public readonly reviews: MockFSRSBindingReview[]) {}
}

vi.mock("@open-spaced-repetition/binding", () => ({
  computeParameters: computeParametersMock,
  FSRSBindingReview: MockFSRSBindingReview,
  FSRSBindingItem: MockFSRSBindingItem,
}));

function makeLog(
  id: string,
  flashcardId: string,
  rating: FlashcardReviewLogEntity["rating"],
  reviewedAt: Date,
  daysElapsed: number,
): FlashcardReviewLogEntity {
  return {
    id,
    flashcardId,
    userId: "user-1",
    clientReviewId: null,
    rating,
    reviewedAt,
    daysElapsed,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  };
}

describe("shouldOptimizeFsrsParameters", () => {
  it("waits until enough review history exists", () => {
    expect(shouldOptimizeFsrsParameters(63, 0)).toBe(false);
    expect(shouldOptimizeFsrsParameters(64, 0)).toBe(true);
    expect(shouldOptimizeFsrsParameters(95, 64)).toBe(false);
    expect(shouldOptimizeFsrsParameters(96, 64)).toBe(true);
  });
});

describe("optimizeFsrsParameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    computeParametersMock.mockResolvedValue([1.2, 3.4, 5.6]);
  });

  it("returns null when fewer than 64 logs are provided", async () => {
    await expect(optimizeFsrsParameters([])).resolves.toBeNull();
    expect(computeParametersMock).not.toHaveBeenCalled();
  });

  it("returns null when all card histories are invalid (no daysElapsed > 0)", async () => {
    const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();
    const logs: FlashcardReviewLogEntity[] = [];

    for (let cardIndex = 0; cardIndex < 16; cardIndex++) {
      for (let reviewIndex = 0; reviewIndex < 4; reviewIndex++) {
        logs.push(
          makeLog(
            `log-${cardIndex}-${reviewIndex}`,
            `card-${cardIndex}`,
            reviewIndex === 0 ? "again" : "good",
            new Date(baseTime + (cardIndex * 4 + reviewIndex) * 1000),
            0,
          ),
        );
      }
    }

    await expect(optimizeFsrsParameters(logs)).resolves.toBeNull();
    expect(computeParametersMock).not.toHaveBeenCalled();
  });

  it("skips same-day re-review slices that have no delta_t > 0", async () => {
    const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();
    const logs: FlashcardReviewLogEntity[] = [];

    // Each card: new review (dT=0), same-day re-review (dT=0), then spaced reviews.
    // The slice [r0, r1] has all deltaT=0 and must be filtered to avoid a WASM abort.
    for (let cardIndex = 0; cardIndex < 16; cardIndex++) {
      logs.push(
        makeLog(
          `card-${cardIndex}-0`,
          `card-${cardIndex}`,
          "again",
          new Date(baseTime + cardIndex * 10 * 24 * 60 * 60 * 1000),
          0,
        ),
        makeLog(
          `card-${cardIndex}-1`,
          `card-${cardIndex}`,
          "good",
          new Date(baseTime + cardIndex * 10 * 24 * 60 * 60 * 1000 + 1000),
          0,
        ),
        makeLog(
          `card-${cardIndex}-2`,
          `card-${cardIndex}`,
          "good",
          new Date(
            baseTime +
              cardIndex * 10 * 24 * 60 * 60 * 1000 +
              3 * 24 * 60 * 60 * 1000,
          ),
          3,
        ),
        makeLog(
          `card-${cardIndex}-3`,
          `card-${cardIndex}`,
          "easy",
          new Date(
            baseTime +
              cardIndex * 10 * 24 * 60 * 60 * 1000 +
              8 * 24 * 60 * 60 * 1000,
          ),
          5,
        ),
      );
    }

    const result = await optimizeFsrsParameters(logs);

    expect(result).toEqual([1.2, 3.4, 5.6]);
    expect(computeParametersMock).toHaveBeenCalledTimes(1);
    // Every item passed to computeParameters must have at least one review with
    // deltaT > 0 — verifies the same-day slice filter is applied before the call.
    const [trainingSet] = computeParametersMock.mock.calls[0] as [
      MockFSRSBindingItem[],
    ];
    for (const item of trainingSet) {
      expect(item.reviews.some((r) => r.deltaT > 0)).toBe(true);
    }
  });

  it("passes only valid card histories to the optimizer, ignoring invalid ones", async () => {
    const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();
    const logs: FlashcardReviewLogEntity[] = [];
    const ratingPatterns: FlashcardReviewLogEntity["rating"][][] = [
      ["again", "hard", "good", "easy"],
      ["good", "hard", "good", "easy"],
      ["hard", "good", "good", "easy"],
      ["again", "again", "hard", "good"],
    ];

    for (let cardIndex = 0; cardIndex < 16; cardIndex++) {
      const pattern = ratingPatterns[cardIndex % ratingPatterns.length];
      for (let reviewIndex = 0; reviewIndex < 4; reviewIndex++) {
        logs.push(
          makeLog(
            `valid-${cardIndex}-${reviewIndex}`,
            `valid-card-${cardIndex}`,
            pattern[reviewIndex],
            new Date(
              baseTime + (cardIndex * 8 + reviewIndex) * 24 * 60 * 60 * 1000,
            ),
            reviewIndex === 0 ? 0 : reviewIndex,
          ),
        );
      }
    }

    // Invalid cards (all daysElapsed=0) mixed in — must be excluded.
    for (let index = 0; index < 16; index++) {
      logs.push(
        makeLog(
          `invalid-${index}-0`,
          `invalid-card-${index}`,
          "again",
          new Date(baseTime + 10_000_000 + index * 2000),
          0,
        ),
        makeLog(
          `invalid-${index}-1`,
          `invalid-card-${index}`,
          "good",
          new Date(baseTime + 10_000_000 + index * 2000 + 1000),
          0,
        ),
      );
    }

    const result = await optimizeFsrsParameters(logs);

    expect(result).toEqual([1.2, 3.4, 5.6]);
    expect(computeParametersMock).toHaveBeenCalledTimes(1);
    const [trainingSet] = computeParametersMock.mock.calls[0] as [
      MockFSRSBindingItem[],
    ];
    expect(trainingSet.length).toBeGreaterThan(0);
    // No item built from invalid-card data (all dT=0) should reach the optimizer.
    for (const item of trainingSet) {
      expect(item.reviews.some((r) => r.deltaT > 0)).toBe(true);
    }
  });
});
