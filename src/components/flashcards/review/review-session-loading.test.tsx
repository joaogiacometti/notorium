import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ExamSessionLoading,
  ReviewSessionLoading,
} from "@/components/flashcards/review/review-session-loading";

describe("ReviewSessionLoading", () => {
  it("renders the session frame without sidebar or page chrome", () => {
    const markup = renderToStaticMarkup(<ReviewSessionLoading />);

    expect(markup).toContain('data-testid="review-session-loading"');
    expect(markup).toContain("h-svh");
    expect(markup).not.toContain("<nav");
  });

  it("shows the header badge placeholder only for exams", () => {
    // The review header renders no badge, so its skeleton must not reserve one
    // either, or the progress text shifts once the session loads.
    const skeletons = (markup: string) =>
      markup.match(/data-slot="skeleton"/g)?.length ?? 0;
    const review = renderToStaticMarkup(<ReviewSessionLoading />);
    const exam = renderToStaticMarkup(<ExamSessionLoading />);

    expect(skeletons(exam)).toBe(skeletons(review) + 1);
  });
});
