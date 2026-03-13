import { describe, expect, it } from "vitest";
import {
  getFlashcardManageExcerpt,
  getFlashcardManageExcerptSourceLength,
} from "@/features/flashcards/manage-excerpts";

describe("getFlashcardManageExcerpt", () => {
  it("removes rich text markup", () => {
    expect(
      getFlashcardManageExcerpt("<p>Hello <strong>flashcard</strong></p>"),
    ).toBe("Hello flashcard");
  });

  it("truncates plain text content to 25 characters", () => {
    expect(
      getFlashcardManageExcerpt(
        "<p>abcdefghijklmnopqrstuvwxyz and more content</p>",
      ),
    ).toBe("abcdefghijklmnopqrstuvwxy...");
  });

  it("keeps short plain text values unchanged", () => {
    expect(getFlashcardManageExcerpt("<p>Short front</p>")).toBe("Short front");
  });

  it("uses a bounded source length that is longer than the final excerpt", () => {
    expect(getFlashcardManageExcerptSourceLength()).toBeGreaterThan(25);
  });
});
