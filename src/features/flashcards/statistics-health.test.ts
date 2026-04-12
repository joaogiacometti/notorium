import { describe, expect, it } from "vitest";
import { getFlashcardStudyHealth } from "@/features/flashcards/statistics-health";

describe("getFlashcardStudyHealth", () => {
  it("returns a strong score for healthy coverage and low due pressure", () => {
    expect(
      getFlashcardStudyHealth({
        totalCards: 20,
        dueCards: 2,
        reviewedCards: 18,
        neverReviewedCards: 2,
        totalReviews: 80,
        totalLapses: 4,
        averageReviewsPerCard: 4,
        averageLapsesPerReviewedCard: 0.22,
      }),
    ).toEqual({
      score: 91,
      label: "Strong",
      tone: "success",
      detail: "Coverage is healthy and the due queue is under control.",
    });
  });

  it("returns a steady score for a mixed study picture", () => {
    expect(
      getFlashcardStudyHealth({
        totalCards: 12,
        dueCards: 4,
        reviewedCards: 7,
        neverReviewedCards: 5,
        totalReviews: 28,
        totalLapses: 5,
        averageReviewsPerCard: 2.3,
        averageLapsesPerReviewedCard: 0.71,
      }),
    ).toEqual({
      score: 64,
      label: "Steady",
      tone: "warning",
      detail: "Progress is holding, but the review queue needs attention.",
    });
  });

  it("returns a low score for heavy due backlog and low review coverage", () => {
    expect(
      getFlashcardStudyHealth({
        totalCards: 10,
        dueCards: 8,
        reviewedCards: 2,
        neverReviewedCards: 8,
        totalReviews: 6,
        totalLapses: 3,
        averageReviewsPerCard: 0.6,
        averageLapsesPerReviewedCard: 1.5,
      }),
    ).toEqual({
      score: 23,
      label: "Needs focus",
      tone: "danger",
      detail: "Too many cards are still due or not reviewed enough yet.",
    });
  });
});
