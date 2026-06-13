import { describe, expect, it } from "vitest";
import { computeReviewStreaks } from "@/features/flashcard-review/streaks";
import type { FlashcardStatisticsTrendPoint } from "@/lib/server/api-contracts";

function points(...counts: number[]): FlashcardStatisticsTrendPoint[] {
  return counts.map((count, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, "0")}`,
    count,
  }));
}

describe("computeReviewStreaks", () => {
  it("returns zero streaks for no activity", () => {
    expect(computeReviewStreaks(points(0, 0, 0))).toEqual({
      current: 0,
      longest: 0,
    });
  });

  it("returns zero streaks for an empty range", () => {
    expect(computeReviewStreaks([])).toEqual({ current: 0, longest: 0 });
  });

  it("counts a current streak ending today", () => {
    expect(computeReviewStreaks(points(0, 3, 5, 2))).toEqual({
      current: 3,
      longest: 3,
    });
  });

  it("keeps the current streak alive when today has no reviews yet", () => {
    expect(computeReviewStreaks(points(3, 5, 0))).toEqual({
      current: 2,
      longest: 2,
    });
  });

  it("breaks the current streak after a full empty day", () => {
    expect(computeReviewStreaks(points(3, 5, 0, 0))).toEqual({
      current: 0,
      longest: 2,
    });
  });

  it("tracks the longest streak across gaps", () => {
    expect(computeReviewStreaks(points(1, 1, 1, 0, 1, 1))).toEqual({
      current: 2,
      longest: 3,
    });
  });
});
