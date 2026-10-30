import { describe, expect, it } from "vitest";
import {
  resolveFlashcardManageFilter,
  resolveFlashcardsView,
} from "@/features/flashcards/view";

describe("resolveFlashcardsView", () => {
  it("returns review when view is missing", () => {
    expect(resolveFlashcardsView(undefined)).toBe("review");
  });

  it("returns manage for the manage view", () => {
    expect(resolveFlashcardsView("manage")).toBe("manage");
  });

  it("falls back to review for the removed statistics view", () => {
    expect(resolveFlashcardsView("statistics")).toBe("review");
  });

  it("falls back to review for legacy refine links", () => {
    expect(resolveFlashcardsView("refine")).toBe("review");
  });

  it("falls back to review for invalid values", () => {
    expect(resolveFlashcardsView("invalid")).toBe("review");
  });
});

describe("resolveFlashcardManageFilter", () => {
  it("keeps the study later and struggling filters", () => {
    expect(resolveFlashcardManageFilter("studyLater")).toBe("studyLater");
    expect(resolveFlashcardManageFilter("struggling")).toBe("struggling");
  });

  it("drops missing or unknown filters", () => {
    expect(resolveFlashcardManageFilter(undefined)).toBeUndefined();
    expect(resolveFlashcardManageFilter("unknown")).toBeUndefined();
  });
});
