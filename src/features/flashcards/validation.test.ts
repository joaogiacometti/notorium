import { describe, expect, it } from "vitest";
import {
  bulkDeleteFlashcardsSchema,
  bulkMoveFlashcardsSchema,
  bulkResetFlashcardsSchema,
  createFlashcardSchema,
  deleteFlashcardSchema,
  editFlashcardSchema,
  flashcardsManageQuerySchema,
  resetFlashcardSchema,
} from "@/features/flashcards/validation";
import { LIMITS } from "@/lib/config/limits";

const richFront = "<p>What is 2 + 2?</p>";
const richBack = "<p>4</p>";

describe("createFlashcardSchema", () => {
  it("accepts valid input", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "deck-1",
      front: richFront,
      back: richBack,
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing subjectId", () => {
    const result = createFlashcardSchema.safeParse({
      front: richFront,
      back: richBack,
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty rich text front", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "deck-1",
      front: "<p> </p>",
      back: richBack,
    });

    expect(result.success).toBe(false);
  });

  it("rejects too many internal attachments across front and back", () => {
    const front = Array.from(
      { length: LIMITS.maxAttachmentsPerFlashcard },
      (_, index) =>
        `<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Ffront-${index}.png">`,
    ).join("");
    const back =
      '<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Foverflow.png">';

    const result = createFlashcardSchema.safeParse({
      subjectId: "deck-1",
      front,
      back,
    });

    expect(result.success).toBe(false);
  });
});

describe("editFlashcardSchema", () => {
  it("accepts valid input", () => {
    const result = editFlashcardSchema.safeParse({
      id: "flashcard-1",
      subjectId: "deck-1",
      front: richFront,
      back: richBack,
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = editFlashcardSchema.safeParse({
      subjectId: "deck-1",
      front: richFront,
      back: richBack,
    });

    expect(result.success).toBe(false);
  });
});

describe("delete and bulk schemas", () => {
  it("accepts valid delete id", () => {
    expect(deleteFlashcardSchema.safeParse({ id: "flashcard-1" }).success).toBe(
      true,
    );
  });

  it("accepts valid bulk move input", () => {
    expect(
      bulkMoveFlashcardsSchema.safeParse({
        ids: ["flashcard-1", "flashcard-2"],
        subjectId: "deck-2",
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate ids in bulk reset", () => {
    expect(
      bulkResetFlashcardsSchema.safeParse({
        ids: ["flashcard-1", "flashcard-1"],
      }).success,
    ).toBe(false);
  });

  it("accepts valid bulk delete ids", () => {
    expect(
      bulkDeleteFlashcardsSchema.safeParse({
        ids: ["flashcard-1", "flashcard-2"],
      }).success,
    ).toBe(true);
  });

  it("accepts valid reset id", () => {
    expect(resetFlashcardSchema.safeParse({ id: "flashcard-1" }).success).toBe(
      true,
    );
  });
});

describe("flashcardsManageQuerySchema", () => {
  it("accepts the largest selectable page size", () => {
    const result = flashcardsManageQuerySchema.safeParse({
      pageIndex: 0,
      pageSize: 500,
    });

    expect(result.success).toBe(true);
  });
});

describe("flashcard source validation", () => {
  const card = { subjectId: "s1", front: "<p>Q</p>", back: "<p>A</p>" };
  it("preserves a valid note source", () => {
    expect(
      createFlashcardSchema.parse({
        ...card,
        source: { kind: "note", id: "doc-1" },
      }).source,
    ).toEqual({ kind: "note", id: "doc-1" });
  });
  it.each([
    { kind: "note", id: "" },
    { kind: "url", id: "https://example.com" },
  ])("rejects invalid source %j", (source) => {
    expect(createFlashcardSchema.safeParse({ ...card, source }).success).toBe(
      false,
    );
  });
});
