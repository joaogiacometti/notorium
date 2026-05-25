import { afterEach, describe, expect, it, vi } from "vitest";
import type { FlashcardReviewLogEntity } from "@/lib/server/api-contracts";

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

async function loadFsrsOptimizerModule() {
  return import("@/features/flashcards/fsrs/optimizer");
}

afterEach(() => {
  vi.resetModules();
});

describe("shouldOptimizeFsrsParameters", () => {
  it("waits until enough review history exists", async () => {
    const { shouldOptimizeFsrsParameters } = await loadFsrsOptimizerModule();

    expect(shouldOptimizeFsrsParameters(63, 0)).toBe(false);
    expect(shouldOptimizeFsrsParameters(64, 0)).toBe(true);
    expect(shouldOptimizeFsrsParameters(95, 64)).toBe(false);
    expect(shouldOptimizeFsrsParameters(96, 64)).toBe(true);
  });
});

describe("optimizeFsrsParameters", () => {
  it("returns null when all card histories are invalid", async () => {
    const { optimizeFsrsParameters } = await loadFsrsOptimizerModule();
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
  });

  it(
    "skips same-day re-review slices that have no delta_t > 0",
    {
      timeout: 15_000,
    },
    async () => {
      const { optimizeFsrsParameters } = await loadFsrsOptimizerModule();
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
              baseTime + cardIndex * 10 * 24 * 60 * 60 * 1000 + 3 * 24 * 60 * 60 * 1000,
            ),
            3,
          ),
          makeLog(
            `card-${cardIndex}-3`,
            `card-${cardIndex}`,
            "easy",
            new Date(
              baseTime + cardIndex * 10 * 24 * 60 * 60 * 1000 + 8 * 24 * 60 * 60 * 1000,
            ),
            5,
          ),
        );
      }

      const weights = await optimizeFsrsParameters(logs);

      expect(weights).not.toBeNull();
      expect(weights?.length).toBeGreaterThan(0);
    },
  );

  it(
    "optimizes valid histories even when invalid histories are present",
    {
      timeout: 15_000,
    },
    async () => {
      const { optimizeFsrsParameters } = await loadFsrsOptimizerModule();
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

      const weights = await optimizeFsrsParameters(logs);

      expect(weights).not.toBeNull();
      expect(weights?.length).toBeGreaterThan(0);
    },
  );
});
