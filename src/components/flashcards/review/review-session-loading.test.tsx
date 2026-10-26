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
    const review = renderToStaticMarkup(<ReviewSessionLoading />);
    const exam = renderToStaticMarkup(<ExamSessionLoading />);

    expect(review).not.toContain("h-7 w-16");
    expect(exam).toContain("h-7 w-16");
  });
});
