import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExamBadge } from "@/components/flashcards/review/exam-badge";

describe("ExamBadge", () => {
  it("labels the session as an exam", () => {
    expect(renderToStaticMarkup(<ExamBadge />)).toContain("Exam");
  });
});
