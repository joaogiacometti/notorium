import type { FlashcardStatisticsSummary } from "@/lib/server/api-contracts";

export interface FlashcardStudyHealth {
  score: number;
  label: string;
  tone: "danger" | "warning" | "success";
  detail: string;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getFlashcardStudyHealth(
  summary: FlashcardStatisticsSummary,
): FlashcardStudyHealth {
  if (summary.totalCards === 0) {
    return {
      score: 0,
      label: "No data",
      tone: "warning",
      detail: "Add cards to start tracking study health.",
    };
  }

  const reviewedCoverage = summary.reviewedCards / summary.totalCards;
  const duePressure = summary.dueCards / summary.totalCards;
  const lapseRate =
    summary.totalReviews > 0 ? summary.totalLapses / summary.totalReviews : 0;
  const score = clampScore(
    reviewedCoverage * 55 + (1 - duePressure) * 35 + (1 - lapseRate) * 10,
  );

  if (score >= 75) {
    return {
      score,
      label: "Strong",
      tone: "success",
      detail: "Coverage is healthy and the due queue is under control.",
    };
  }

  if (score >= 45) {
    return {
      score,
      label: "Steady",
      tone: "warning",
      detail: "Progress is holding, but the review queue needs attention.",
    };
  }

  return {
    score,
    label: "Needs focus",
    tone: "danger",
    detail: "Too many cards are still due or not reviewed enough yet.",
  };
}
