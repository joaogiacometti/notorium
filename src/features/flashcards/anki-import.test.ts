import { describe, expect, it } from "vitest";
import {
  mapAnkiImportCardToFlashcardInsert,
  parseAnkiImportFile,
  parseAnkiTextExport,
} from "@/features/flashcards/anki-import";

describe("parseAnkiTextExport", () => {
  it("parses tab-separated front and back fields", () => {
    const result = parseAnkiTextExport("Question\tAnswer\nFront 2\tBack 2");

    expect(result).toEqual([
      { front: "Question", back: "Answer" },
      { front: "Front 2", back: "Back 2" },
    ]);
  });

  it("respects declared text separators and ignores comments", () => {
    const result = parseAnkiTextExport(
      '#separator:semicolon\n#comment\n"Question; 1";"Answer; 1"',
    );

    expect(result).toEqual([{ front: "Question; 1", back: "Answer; 1" }]);
  });

  it("skips rows without two populated fields", () => {
    const result = parseAnkiTextExport("Question\t\n\tAnswer");

    expect(result).toEqual([]);
  });
});

describe("parseAnkiImportFile", () => {
  it("accepts txt files", async () => {
    const file = new File(["Question\tAnswer"], "deck.txt", {
      type: "text/plain",
    });

    await expect(parseAnkiImportFile(file)).resolves.toEqual([
      { front: "Question", back: "Answer" },
    ]);
  });

  it("rejects unsupported file extensions", async () => {
    const file = new File(["ignored"], "deck.apkg", {
      type: "application/octet-stream",
    });

    await expect(parseAnkiImportFile(file)).rejects.toThrow("invalid-format");
  });
});

describe("mapAnkiImportCardToFlashcardInsert", () => {
  it("preserves provided scheduling metadata", () => {
    const now = new Date("2026-03-08T10:00:00.000Z");

    const result = mapAnkiImportCardToFlashcardInsert(
      {
        front: "Question",
        back: "Answer",
        state: "review",
        dueAt: "2026-03-10T10:00:00.000Z",
        stability: 5.4321,
        difficulty: 4.5678,
        ease: 230,
        intervalDays: 12,
        learningStep: 2,
        lastReviewedAt: "2026-03-05T10:00:00.000Z",
        reviewCount: 7,
        lapseCount: 1,
      },
      now,
    );

    expect(result).toMatchObject({
      front: "Question",
      back: "Answer",
      state: "review",
      dueAt: new Date("2026-03-10T10:00:00.000Z"),
      stability: "5.4321",
      difficulty: "4.5678",
      ease: 230,
      intervalDays: 12,
      learningStep: 2,
      lastReviewedAt: new Date("2026-03-05T10:00:00.000Z"),
      reviewCount: 7,
      lapseCount: 1,
      updatedAt: now,
    });
  });

  it("falls back to initial scheduling defaults for missing metadata", () => {
    const now = new Date("2026-03-08T10:00:00.000Z");

    const result = mapAnkiImportCardToFlashcardInsert(
      {
        front: "Question",
        back: "Answer",
      },
      now,
    );

    expect(result.front).toBe("Question");
    expect(result.back).toBe("Answer");
    expect(result.state).toBe("new");
    expect(result.dueAt).toEqual(now);
    expect(result.stability).toBe("0.0000");
    expect(result.difficulty).toBe("0.0000");
    expect(result.ease).toBe(250);
    expect(result.intervalDays).toBe(0);
    expect(result.learningStep).toBe(0);
    expect(result.lastReviewedAt).toBeNull();
    expect(result.reviewCount).toBe(0);
    expect(result.lapseCount).toBe(0);
    expect(result.updatedAt).toEqual(now);
  });

  it("normalizes negative counters and intervals", () => {
    const now = new Date("2026-03-08T10:00:00.000Z");

    const result = mapAnkiImportCardToFlashcardInsert(
      {
        front: "Question",
        back: "Answer",
        intervalDays: -5,
        learningStep: -2,
        reviewCount: -3,
        lapseCount: -1,
      },
      now,
    );

    expect(result.intervalDays).toBe(0);
    expect(result.learningStep).toBe(0);
    expect(result.reviewCount).toBe(0);
    expect(result.lapseCount).toBe(0);
  });

  it("falls back to defaults for non-finite imported scheduling values", () => {
    const now = new Date("2026-03-08T10:00:00.000Z");

    const result = mapAnkiImportCardToFlashcardInsert(
      {
        front: "Question",
        back: "Answer",
        stability: Number.NaN,
        difficulty: Number.POSITIVE_INFINITY,
        intervalDays: Number.NaN,
        learningStep: Number.NaN,
        lastReviewedAt: "not-a-date",
        reviewCount: Number.NaN,
        lapseCount: Number.NaN,
      } as never,
      now,
    );

    expect(result.stability).toBe("0.0000");
    expect(result.difficulty).toBe("0.0000");
    expect(result.intervalDays).toBe(0);
    expect(result.learningStep).toBe(0);
    expect(result.lastReviewedAt).toBeNull();
    expect(result.reviewCount).toBe(0);
    expect(result.lapseCount).toBe(0);
  });
});
