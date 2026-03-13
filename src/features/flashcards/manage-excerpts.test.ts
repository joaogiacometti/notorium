import { describe, expect, it } from "vitest";
import {
  getFlashcardManageBackExcerpt,
  getFlashcardManageBackExcerptSourceLength,
} from "@/features/flashcards/manage-excerpts";

describe("getFlashcardManageBackExcerpt", () => {
  it("removes rich text markup", () => {
    expect(
      getFlashcardManageBackExcerpt("<p>Hello <strong>flashcard</strong></p>"),
    ).toBe("Hello flashcard");
  });

  it("truncates plain text content to 25 characters", () => {
    expect(
      getFlashcardManageBackExcerpt(
        "<p>abcdefghijklmnopqrstuvwxyz and more content</p>",
      ),
    ).toBe("abcdefghijklmnopqrstuvwxy...");
  });

  it("keeps short plain text values unchanged", () => {
    expect(getFlashcardManageBackExcerpt("<p>Short front</p>")).toBe(
      "Short front",
    );
  });

  it("uses a bounded source length that is longer than the final excerpt", () => {
    expect(getFlashcardManageBackExcerptSourceLength()).toBeGreaterThan(25);
  });
});
