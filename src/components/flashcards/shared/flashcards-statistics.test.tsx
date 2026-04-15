import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FlashcardsStatistics } from "@/components/flashcards/shared/flashcards-statistics";
import type { FlashcardStatisticsState } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function hasParagraphWithText(container: HTMLElement, text: string): boolean {
  return Array.from(container.querySelectorAll("p")).some(
    (paragraph) => paragraph.textContent?.trim() === text,
  );
}

const statistics: FlashcardStatisticsState = {
  summary: {
    totalCards: 6,
    dueCards: 2,
    reviewedCards: 4,
    neverReviewedCards: 2,
    totalReviews: 4,
    totalLapses: 1,
    averageReviewsPerCard: 0.67,
    averageLapsesPerReviewedCard: 0.25,
  },
  states: [
    { key: "new", label: "New", count: 2 },
    { key: "learning", label: "Learning", count: 3 },
    { key: "review", label: "Review", count: 1 },
    { key: "relearning", label: "Relearning", count: 0 },
  ],
  ratings: [
    { key: "again", label: "Again", count: 0 },
    { key: "hard", label: "Hard", count: 1 },
    { key: "good", label: "Good", count: 2 },
    { key: "easy", label: "Easy", count: 1 },
  ],
  trend: [
    { date: "2026-04-08", count: 0 },
    { date: "2026-04-09", count: 0 },
    { date: "2026-04-10", count: 0 },
    { date: "2026-04-11", count: 0 },
    { date: "2026-04-12", count: 0 },
    { date: "2026-04-13", count: 0 },
    { date: "2026-04-14", count: 4 },
  ],
};

describe("FlashcardsStatistics", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("does not render the Cards mini-stat and keeps Due now, Reviewed, and Untouched", async () => {
    await act(async () => {
      root.render(
        <FlashcardsStatistics
          statistics={statistics}
          decks={[]}
          deckId={undefined}
        />,
      );
    });

    expect(hasParagraphWithText(container, "Cards")).toBe(false);
    expect(hasParagraphWithText(container, "Due now")).toBe(true);
    expect(hasParagraphWithText(container, "Reviewed")).toBe(true);
    expect(hasParagraphWithText(container, "Untouched")).toBe(true);
  });
});
