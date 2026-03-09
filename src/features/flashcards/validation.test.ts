import { describe, expect, it } from "vitest";
import {
  createFlashcardSchema,
  deleteFlashcardSchema,
  editFlashcardSchema,
  resetFlashcardSchema,
} from "@/features/flashcards/validation";

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

  it("rejects front longer than 500 characters", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "a".repeat(501),
      back: "Answer",
    });

    expect(result.success).toBe(false);
  });

  it("rejects back longer than 2000 characters", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "Question",
      back: "a".repeat(2001),
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
      front: `<p>${"a".repeat(500)}</p>`,
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

  it("rejects rich text front when plain text exceeds 500 characters", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: `<p>${"a".repeat(501)}</p>`,
      back: "Answer",
    });

    expect(result.success).toBe(false);
  });

  it("rejects rich text back when plain text exceeds 2000 characters", () => {
    const result = createFlashcardSchema.safeParse({
      subjectId: "subject-1",
      front: "Question",
      back: `<p>${"a".repeat(2001)}</p>`,
    });

    expect(result.success).toBe(false);
  });
});

describe("editFlashcardSchema", () => {
  it("accepts valid input", () => {
    const result = editFlashcardSchema.safeParse({
      id: "flashcard-1",
      front: "Front",
      back: "Back",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = editFlashcardSchema.safeParse({
      front: "Front",
      back: "Back",
    });

    expect(result.success).toBe(false);
  });

  it("rejects back with only empty rich text markup", () => {
    const result = editFlashcardSchema.safeParse({
      id: "flashcard-1",
      front: "<p>Front</p>",
      back: "<p> </p>",
    });

    expect(result.success).toBe(false);
  });

  it("rejects front with only empty rich text markup", () => {
    const result = editFlashcardSchema.safeParse({
      id: "flashcard-1",
      front: "<p> </p>",
      back: "<p>Back</p>",
    });

    expect(result.success).toBe(false);
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
