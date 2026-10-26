import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FlashcardsDueCard } from "@/components/home/flashcards-due-card";

function hrefOf(markup: string): string | undefined {
  return /href="([^"]*)"/.exec(markup)?.[1];
}

describe("FlashcardsDueCard", () => {
  it("links straight into the review session when cards are due", () => {
    const markup = renderToStaticMarkup(
      <FlashcardsDueCard summary={{ dueCount: 10, totalCount: 16 }} />,
    );

    expect(hrefOf(markup)).toBe("/flashcards/review");
    expect(markup).toContain("Review now");
  });

  it("links to the flashcards hub when caught up", () => {
    const markup = renderToStaticMarkup(
      <FlashcardsDueCard summary={{ dueCount: 0, totalCount: 16 }} />,
    );

    expect(hrefOf(markup)).toBe("/flashcards?view=review");
    expect(markup).toContain("Browse flashcards");
  });
});
