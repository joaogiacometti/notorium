import type {
  FlashcardStatisticsStreak,
  FlashcardStatisticsTrendPoint,
} from "@/lib/server/api-contracts";

/**
 * Compute current and longest study streaks from chronologically ordered daily
 * review counts (oldest first, one entry per calendar day, gaps filled with 0).
 *
 * The current streak counts back from the most recent day. A zero-count today
 * does not break the streak as long as the previous day had reviews, matching
 * the common "you still have today to study" habit-tracker behaviour.
 *
 * @example
 * computeReviewStreaks([
 *   { date: "2026-06-11", count: 3 },
 *   { date: "2026-06-12", count: 5 },
 *   { date: "2026-06-13", count: 0 },
 * ]); // { current: 2, longest: 2 }
 */
export function computeReviewStreaks(
  points: FlashcardStatisticsTrendPoint[],
): FlashcardStatisticsStreak {
  let longest = 0;
  let run = 0;

  for (const point of points) {
    run = point.count > 0 ? run + 1 : 0;
    if (run > longest) {
      longest = run;
    }
  }

  return { current: computeCurrentStreak(points), longest };
}

function computeCurrentStreak(points: FlashcardStatisticsTrendPoint[]): number {
  let current = 0;

  for (let index = points.length - 1; index >= 0; index--) {
    const point = points[index];
    if (point.count > 0) {
      current++;
      continue;
    }
    // Allow an empty final day (today) without breaking the streak.
    if (index === points.length - 1) {
      continue;
    }
    break;
  }

  return current;
}
