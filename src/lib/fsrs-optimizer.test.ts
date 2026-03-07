import { describe, expect, it } from "vitest";
import type { FlashcardReviewLogEntity } from "@/lib/api/contracts";
import {
  optimizeFsrsParameters,
  shouldOptimizeFsrsParameters,
} from "@/lib/fsrs-optimizer";

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
  it("fails closed when the optimizer rejects the training set", async () => {
    const logs: FlashcardReviewLogEntity[] = [];
    const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();

    for (let cardIndex = 0; cardIndex < 16; cardIndex++) {
      for (let reviewIndex = 0; reviewIndex < 4; reviewIndex++) {
        const reviewedAt = new Date(
          baseTime + (cardIndex * 4 + reviewIndex) * 24 * 60 * 60 * 1000,
        );

        logs.push(
          makeLog(
            `log-${cardIndex}-${reviewIndex}`,
            `card-${cardIndex}`,
            reviewIndex === 0 ? "again" : reviewIndex === 3 ? "easy" : "good",
            reviewedAt,
            reviewIndex === 0 ? 0 : reviewIndex,
          ),
        );
      }
    }

    const weights = await optimizeFsrsParameters(logs);

    expect(weights).toBeNull();
  });
});
