import { describe, expect, it } from "vitest";
import {
  flashcardExamScopeSchema,
  flashcardReviewStateQuerySchema,
  reviewFlashcardSchema,
} from "@/features/flashcard-review/validation";
import { LIMITS } from "@/lib/config/limits";

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

describe("flashcardReviewStateQuerySchema", () => {
  it("accepts a subject scope with a batch limit", () => {
    const result = flashcardReviewStateQuerySchema.safeParse({
      subjectId: "subject-1",
      limit: 50,
    });

    expect(result.success).toBe(true);
  });

  it("accepts an empty scope", () => {
    expect(flashcardReviewStateQuerySchema.safeParse({}).success).toBe(true);
  });

  it.each([0, -1, 1.5, LIMITS.reviewDueLimitMax + 1])(
    "rejects limit %s",
    (limit) => {
      const result = flashcardReviewStateQuerySchema.safeParse({ limit });

      expect(result.success).toBe(false);
    },
  );

  it("rejects an empty subject id", () => {
    const result = flashcardReviewStateQuerySchema.safeParse({
      subjectId: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("flashcardExamScopeSchema", () => {
  it("strips fields outside the exam scope", () => {
    const result = flashcardExamScopeSchema.safeParse({
      subjectId: "subject-1",
      subjectIds: ["subject-2"],
    });

    expect(result.success && result.data).toEqual({ subjectId: "subject-1" });
  });

  it("rejects a non-string subject id", () => {
    const result = flashcardExamScopeSchema.safeParse({ subjectId: 42 });

    expect(result.success).toBe(false);
  });
});
