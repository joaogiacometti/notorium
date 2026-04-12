import { describe, expect, it } from "vitest";
import {
  bulkDeleteFlashcardsSchema,
  bulkMoveFlashcardsSchema,
  createFlashcardSchema,
  deleteFlashcardSchema,
  editFlashcardSchema,
  generateFlashcardBackSchema,
  generateFlashcardsSchema,
  resetFlashcardSchema,
} from "@/features/flashcards/validation";
import { LIMITS } from "@/lib/config/limits";

describe("createFlashcardSchema", () => {
  it("accepts valid input", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "What is 2 + 2?",
      back: "4",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty front", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "",
      back: "4",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty back", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "Question",
      back: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects front longer than max characters", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "a".repeat(LIMITS.flashcardFrontMax + 1),
      back: "Answer",
    });

    expect(result.success).toBe(false);
  });

  it("rejects back longer than max characters", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "Question",
      back: "a".repeat(LIMITS.flashcardBackMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects front with only empty rich text markup", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "<p> </p>",
      back: "Answer",
    });

    expect(result.success).toBe(false);
  });

  it("accepts rich text when plain text length is within limit", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: `<p>${"a".repeat(LIMITS.flashcardFrontMax)}</p>`,
      back: "<p>Answer</p>",
    });

    expect(result.success).toBe(true);
  });

  it("accepts image-only content", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: '<p><img src="https://example.com/front.png"></p>',
      back: '<p><img src="https://example.com/back.png"></p>',
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty-string deckId by normalizing it", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      deckId: "",
      front: "What is 2 + 2?",
      back: "4",
    });

    expect(result.success).toBe(true);
  });

  it("rejects rich text front when plain text exceeds max characters", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: `<p>${"a".repeat(LIMITS.flashcardFrontMax + 1)}</p>`,
      back: "Answer",
    });

    expect(result.success).toBe(false);
  });

  it("rejects rich text back when plain text exceeds max characters", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "Question",
      back: `<p>${"a".repeat(LIMITS.flashcardBackMax + 1)}</p>`,
    });

    expect(result.success).toBe(false);
  });

  it("accepts flashcards at exactly max internal attachments", () => {
    const front = Array.from(
      { length: LIMITS.maxAttachmentsPerFlashcard - 1 },
      (_, index) =>
        `<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Ffront-${index}.png">`,
    ).join("");
    const back =
      '<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Fback.png">';

    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front,
      back,
    });

    expect(result.success).toBe(true);
  });

  it("rejects flashcards with too many internal attachments across front and back", () => {
    const front = Array.from(
      { length: LIMITS.maxAttachmentsPerFlashcard },
      (_, index) =>
        `<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Ffront-${index}.png">`,
    ).join("");
    const back =
      '<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Fback-overflow.png">';

    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
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
      subjectId: "subject-1",
      front: "Front",
      back: "Back",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = editFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "Front",
      back: "Back",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing subjectId", () => {
    const result = editFlashcardSchema.safeParse({
      id: "flashcard-1",
      front: "Front",
      back: "Back",
    });

    expect(result.success).toBe(false);
  });

  it("rejects back with only empty rich text markup", () => {
    const result = editFlashcardSchema.safeParse({
      id: "flashcard-1",
      subjectId: "subject-1",
      front: "<p>Front</p>",
      back: "<p> </p>",
    });

    expect(result.success).toBe(false);
  });

  it("rejects front with only empty rich text markup", () => {
    const result = editFlashcardSchema.safeParse({
      id: "flashcard-1",
      subjectId: "subject-1",
      front: "<p> </p>",
      back: "<p>Back</p>",
    });

    expect(result.success).toBe(false);
  });
});

describe("generateFlashcardBackSchema", () => {
  it("accepts valid input", () => {
    const result = generateFlashcardBackSchema.safeParse({
      subjectId: "subject-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty front", () => {
    const result = generateFlashcardBackSchema.safeParse({
      subjectId: "subject-1",
      front: "<p> </p>",
    });

    expect(result.success).toBe(false);
  });

  it("accepts optional deckId", () => {
    const result = generateFlashcardBackSchema.safeParse({
      subjectId: "subject-1",
      deckId: "deck-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty-string deckId by normalizing it", () => {
    const result = generateFlashcardBackSchema.safeParse({
      subjectId: "subject-1",
      deckId: "",
      front: "<p>What is ATP?</p>",
    });

    expect(result.success).toBe(true);
  });
});

describe("deleteFlashcardSchema", () => {
  it("accepts valid id", () => {
    const result = deleteFlashcardSchema.safeParse({ id: "flashcard-1" });

    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = deleteFlashcardSchema.safeParse({ id: "" });

    expect(result.success).toBe(false);
  });
});

describe("bulkDeleteFlashcardsSchema", () => {
  it("accepts valid ids", () => {
    const result = bulkDeleteFlashcardsSchema.safeParse({
      ids: ["flashcard-1", "flashcard-2"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty ids", () => {
    const result = bulkDeleteFlashcardsSchema.safeParse({
      ids: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const result = bulkDeleteFlashcardsSchema.safeParse({
      ids: ["flashcard-1", "flashcard-1"],
    });

    expect(result.success).toBe(false);
  });

  it("accepts empty-string deckId by normalizing it", () => {
    const result = bulkMoveFlashcardsSchema.safeParse({
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "subject-1",
      deckId: "",
    });

    expect(result.success).toBe(true);
  });
});

describe("bulkMoveFlashcardsSchema", () => {
  it("accepts valid ids and subjectId", () => {
    const result = bulkMoveFlashcardsSchema.safeParse({
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "subject-1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty ids", () => {
    const result = bulkMoveFlashcardsSchema.safeParse({
      ids: [],
      subjectId: "subject-1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing subjectId", () => {
    const result = bulkMoveFlashcardsSchema.safeParse({
      ids: ["flashcard-1"],
      subjectId: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const result = bulkMoveFlashcardsSchema.safeParse({
      ids: ["flashcard-1", "flashcard-1"],
      subjectId: "subject-1",
    });

    expect(result.success).toBe(false);
  });
});

describe("resetFlashcardSchema", () => {
  it("accepts valid id", () => {
    const result = resetFlashcardSchema.safeParse({ id: "flashcard-1" });

    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = resetFlashcardSchema.safeParse({ id: "" });

    expect(result.success).toBe(false);
  });
});

describe("generateFlashcardsSchema", () => {
  it("accepts valid subject and text", () => {
    const result = generateFlashcardsSchema.safeParse({
      subjectId: "subject-123",
      text: "Some text to generate flashcards from.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty subjectId", () => {
    const result = generateFlashcardsSchema.safeParse({
      subjectId: "",
      text: "Some text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty text", () => {
    const result = generateFlashcardsSchema.safeParse({
      subjectId: "subject-123",
      text: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects text longer than max characters", () => {
    const result = generateFlashcardsSchema.safeParse({
      subjectId: "subject-123",
      text: "a".repeat(LIMITS.flashcardAiMaxInput + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts text at exactly max characters", () => {
    const result = generateFlashcardsSchema.safeParse({
      subjectId: "subject-123",
      text: "a".repeat(LIMITS.flashcardAiMaxInput),
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional deckId", () => {
    const result = generateFlashcardsSchema.safeParse({
      subjectId: "subject-123",
      deckId: "deck-123",
      text: "Some text to generate flashcards from.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty-string deckId by normalizing it", () => {
    const result = generateFlashcardsSchema.safeParse({
      subjectId: "subject-123",
      deckId: "",
      text: "Some text to generate flashcards from.",
    });

    expect(result.success).toBe(true);
  });
});
