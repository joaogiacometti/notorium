import { describe, expect, it } from "vitest";
import {
  getSwipeDirectionAndProgress,
  hasReachedSwipeThreshold,
  shouldCancelSwipeForVerticalMovement,
} from "./use-swipe-gesture";

describe("useSwipeGesture helpers", () => {
  describe("getSwipeDirectionAndProgress", () => {
    it("returns right direction with proportional progress", () => {
      const result = getSwipeDirectionAndProgress(75);
      expect(result.direction).toBe("right");
      expect(result.progress).toBe(0.5);
    });

    it("returns left direction with proportional progress", () => {
      const result = getSwipeDirectionAndProgress(-30);
      expect(result.direction).toBe("left");
      expect(result.progress).toBeCloseTo(0.2);
    });

    it("caps progress at 1", () => {
      const result = getSwipeDirectionAndProgress(999);
      expect(result.direction).toBe("right");
      expect(result.progress).toBe(1);
    });

    it("returns null direction for zero delta", () => {
      const result = getSwipeDirectionAndProgress(0);
      expect(result.direction).toBeNull();
      expect(result.progress).toBe(0);
    });
  });

  describe("shouldCancelSwipeForVerticalMovement", () => {
    it("cancels when vertical movement dominates before threshold", () => {
      expect(shouldCancelSwipeForVerticalMovement(20, 40, false)).toBe(true);
    });

    it("does not cancel when horizontal dominates", () => {
      expect(shouldCancelSwipeForVerticalMovement(40, 20, false)).toBe(false);
    });

    it("does not cancel after threshold already exceeded", () => {
      expect(shouldCancelSwipeForVerticalMovement(20, 40, true)).toBe(false);
    });
  });

  describe("hasReachedSwipeThreshold", () => {
    it("returns false below threshold", () => {
      expect(hasReachedSwipeThreshold(0.39, 60)).toBe(false);
    });

    it("returns true at threshold boundary", () => {
      expect(hasReachedSwipeThreshold(0.4, 60)).toBe(true);
    });

    it("returns true above threshold", () => {
      expect(hasReachedSwipeThreshold(0.8, 60)).toBe(true);
    });
  });
});
