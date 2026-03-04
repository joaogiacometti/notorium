import { describe, expect, it } from "vitest";
import {
  createFlashcardSchema,
  deleteFlashcardSchema,
  editFlashcardSchema,
  resetFlashcardSchema,
} from "@/lib/validations/flashcards";

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
