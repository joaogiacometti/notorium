import { describe, expect, it } from "vitest";
import {
  bulkDeleteFlashcardsSchema,
  bulkMoveFlashcardsSchema,
  bulkResetFlashcardsSchema,
  createFlashcardSchema,
  deleteFlashcardSchema,
  editFlashcardSchema,
  flashcardsManageQuerySchema,
  generateFlashcardBackSchema,
  generateFlashcardsSchema,
  generateMindmapFlashcardsSchema,
  generateNoteFlashcardsSchema,
  resetFlashcardSchema,
} from "@/features/flashcards/validation";
import { LIMITS } from "@/lib/config/limits";

const richFront = "<p>What is 2 + 2?</p>";
const richBack = "<p>4</p>";

describe("createFlashcardSchema", () => {
  it("accepts valid input", () => {
    const result = createFlashcardSchema.safeParse({
      deckId: "deck-1",
      front: richFront,
      back: richBack,
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing deckId", () => {
    const result = createFlashcardSchema.safeParse({
      front: richFront,
      back: richBack,
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty rich text front", () => {
    const result = createFlashcardSchema.safeParse({
      deckId: "deck-1",
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
      deckId: "deck-1",
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
      deckId: "deck-1",
      front: richFront,
      back: richBack,
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = editFlashcardSchema.safeParse({
      deckId: "deck-1",
      front: richFront,
      back: richBack,
    });

    expect(result.success).toBe(false);
  });
});

describe("generateFlashcardBackSchema", () => {
  it("accepts valid input", () => {
    const result = generateFlashcardBackSchema.safeParse({
      deckId: "deck-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result.success).toBe(true);
  });

  it("accepts optional currentBack", () => {
    const result = generateFlashcardBackSchema.safeParse({
      deckId: "deck-1",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>Energy molecule</p>",
    });

    expect(result.success).toBe(true);
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
        deckId: "deck-2",
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

describe("generateFlashcardsSchema", () => {
  it("accepts valid deck and text", () => {
    const result = generateFlashcardsSchema.safeParse({
      deckId: "deck-123",
      text: "Some text to generate flashcards from.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty deckId", () => {
    const result = generateFlashcardsSchema.safeParse({
      deckId: "",
      text: "Some text",
    });

    expect(result.success).toBe(false);
  });

  it("rejects text longer than max characters", () => {
    const result = generateFlashcardsSchema.safeParse({
      deckId: "deck-123",
      text: "a".repeat(LIMITS.flashcardAiMaxInput + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe("generateMindmapFlashcardsSchema", () => {
  it("accepts mindmap and deck ids", () => {
    const result = generateMindmapFlashcardsSchema.safeParse({
      mindmapId: "mindmap-123",
      deckId: "deck-123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing mindmap id", () => {
    const result = generateMindmapFlashcardsSchema.safeParse({
      deckId: "deck-123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing deck id", () => {
    const result = generateMindmapFlashcardsSchema.safeParse({
      mindmapId: "mindmap-123",
    });

    expect(result.success).toBe(false);
  });
});

describe("generateNoteFlashcardsSchema", () => {
  it("accepts note and deck ids", () => {
    const result = generateNoteFlashcardsSchema.safeParse({
      noteId: "note-123",
      deckId: "deck-123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing note id", () => {
    const result = generateNoteFlashcardsSchema.safeParse({
      deckId: "deck-123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing deck id", () => {
    const result = generateNoteFlashcardsSchema.safeParse({
      noteId: "note-123",
    });

    expect(result.success).toBe(false);
  });
});
