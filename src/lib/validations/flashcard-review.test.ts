import { describe, expect, it } from "vitest";
import { reviewFlashcardSchema } from "@/lib/validations/flashcard-review";

describe("reviewFlashcardSchema", () => {
  it("accepts valid grades", () => {
    const grades = ["again", "hard", "good", "easy"] as const;

    for (const grade of grades) {
      const result = reviewFlashcardSchema.safeParse({
        id: "flashcard-1",
        grade,
      });

      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid grade", () => {
    const result = reviewFlashcardSchema.safeParse({
      id: "flashcard-1",
      grade: "ok",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = reviewFlashcardSchema.safeParse({
      id: "",
      grade: "good",
    });

    expect(result.success).toBe(false);
  });
});
