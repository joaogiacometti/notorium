import { describe, expect, it } from "vitest";
import { resolveFlashcardsView } from "@/features/flashcards/view";

describe("resolveFlashcardsView", () => {
  it("returns review when view is missing", () => {
    expect(resolveFlashcardsView(undefined)).toBe("review");
  });

  it("returns manage for the manage view", () => {
    expect(resolveFlashcardsView("manage")).toBe("manage");
  });

  it("falls back to review for invalid values", () => {
    expect(resolveFlashcardsView("invalid")).toBe("review");
  });
});
