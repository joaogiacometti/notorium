import { beforeEach, describe, expect, it, vi } from "vitest";
import { optimizeFsrsParameters } from "@/features/flashcards/fsrs/optimizer";
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
): FlashcardReviewLogEntity {
  return {
    id,
    flashcardId,
    folderId: "folder-1",
    userId: "user-1",
    clientReviewId: null,
    reviewCountAfter: null,
    previousSchedulingState: null,
    rating,
    reviewedAt,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  };
}

const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();
const minuteMs = 60 * 1000;
const dayMs = 24 * 60 * minuteMs;

// 16 cards x 4 reviews: first review, a 10-minute step, then 3 and 8 days.
function makeSpacedHistories(): FlashcardReviewLogEntity[] {
  const offsets = [0, 10 * minuteMs, 3 * dayMs, 8 * dayMs];
  const ratings: FlashcardReviewLogEntity["rating"][] = [
    "again",
    "good",
    "good",
    "easy",
  ];
  return Array.from({ length: 16 }, (_, cardIndex) =>
    offsets.map((offset, reviewIndex) =>
      makeLog(
        `card-${cardIndex}-${reviewIndex}`,
        `card-${cardIndex}`,
        ratings[reviewIndex] ?? "good",
        new Date(baseTime + cardIndex * 10 * dayMs + offset),
      ),
    ),
  ).flat();
}

function getTrainingSet() {
  const [trainingSet] = computeParametersMock.mock.calls[0] as [
    MockFSRSBindingItem[],
  ];
  return trainingSet;
}

describe("optimizeFsrsParameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    computeParametersMock.mockResolvedValue([1.2, 3.4, 5.6]);
  });

  it("returns null when fewer than 64 logs are provided", async () => {
    await expect(optimizeFsrsParameters([])).resolves.toBeNull();
    expect(computeParametersMock).not.toHaveBeenCalled();
  });

  it("returns null when every history was recorded at a single instant", async () => {
    const logs = Array.from({ length: 64 }, (_, index) =>
      makeLog(
        `log-${index}`,
        `card-${Math.floor(index / 4)}`,
        "good",
        new Date(baseTime + Math.floor(index / 4) * dayMs),
      ),
    );

    await expect(optimizeFsrsParameters(logs)).resolves.toBeNull();
    expect(computeParametersMock).not.toHaveBeenCalled();
  });

  it("trains FSRS-7 on fractional days between actual review times", async () => {
    const result = await optimizeFsrsParameters(makeSpacedHistories());

    expect(result).toEqual([1.2, 3.4, 5.6]);
    expect(computeParametersMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ modelVersion: "FSRS-7" }),
    );
    const fullHistory = getTrainingSet().find(
      (item) => item.reviews.length === 4,
    );
    expect(fullHistory?.reviews.map((review) => review.deltaT)).toEqual([
      0,
      10 / (24 * 60),
      3 - 10 / (24 * 60),
      5,
    ]);
  });

  it("leaves out slices without elapsed time, keeping the rest of the card", async () => {
    const logs = makeSpacedHistories().map((log) =>
      // Second review recorded at the same instant as the first.
      log.id.endsWith("-1")
        ? {
            ...log,
            reviewedAt: new Date(log.reviewedAt.getTime() - 10 * minuteMs),
          }
        : log,
    );

    await optimizeFsrsParameters(logs);

    const trainingSet = getTrainingSet();
    expect(trainingSet.length).toBeGreaterThan(0);
    for (const item of trainingSet) {
      expect(item.reviews.some((review) => review.deltaT > 0)).toBe(true);
    }
  });
});
