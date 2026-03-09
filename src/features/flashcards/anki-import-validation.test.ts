import { describe, expect, it } from "vitest";
import {
  ankiImportCardsSchema,
  importAnkiFlashcardsSchema,
} from "@/features/flashcards/anki-import-validation";

describe("ankiImportCardsSchema", () => {
  it("accepts valid cards with scheduling metadata", () => {
    const result = ankiImportCardsSchema.safeParse([
      {
        front: "<p>Question</p>",
        back: "<p>Answer</p>",
        state: "review",
        dueAt: "2026-03-08T12:00:00.000Z",
        stability: 4.1254,
        difficulty: 6.2,
        ease: 250,
        intervalDays: 7,
        learningStep: null,
        lastReviewedAt: "2026-03-01T12:00:00.000Z",
        reviewCount: 3,
        lapseCount: 1,
      },
    ]);

    expect(result.success).toBe(true);
  });

  it("rejects non-array roots", () => {
    const result = ankiImportCardsSchema.safeParse({
      front: "Question",
      back: "Answer",
    });

    expect(result.success).toBe(false);
  });

  it("rejects cards with empty front", () => {
    const result = ankiImportCardsSchema.safeParse([
      {
        front: "<p> </p>",
        back: "Answer",
      },
    ]);

    expect(result.success).toBe(false);
  });

  it("rejects cards with oversized back content", () => {
    const result = ankiImportCardsSchema.safeParse([
      {
        front: "Question",
        back: `<p>${"a".repeat(2001)}</p>`,
      },
    ]);

    expect(result.success).toBe(false);
  });

  it("rejects invalid date metadata", () => {
    const result = ankiImportCardsSchema.safeParse([
      {
        front: "Question",
        back: "Answer",
        dueAt: "not-a-date",
      },
    ]);

    expect(result.success).toBe(false);
  });
});

describe("importAnkiFlashcardsSchema", () => {
  it("accepts a subject id and card array", () => {
    const result = importAnkiFlashcardsSchema.safeParse({
      subjectId: "subject-1",
      cards: [
        {
          front: "Question",
          back: "Answer",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing subject id", () => {
    const result = importAnkiFlashcardsSchema.safeParse({
      cards: [
        {
          front: "Question",
          back: "Answer",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
