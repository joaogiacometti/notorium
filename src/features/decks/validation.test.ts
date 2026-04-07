import { describe, expect, it } from "vitest";
import {
  createDeckSchema,
  deckDescriptionSchema,
  deckNameSchema,
  deleteDeckSchema,
  editDeckSchema,
} from "@/features/decks/validation";
import { LIMITS } from "@/lib/config/limits";

describe("deckNameSchema", () => {
  it("accepts valid name", () => {
    const result = deckNameSchema.safeParse("Chapter 1 Vocabulary");

    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = deckNameSchema.safeParse("");

    expect(result.success).toBe(false);
  });

  it("rejects name longer than max characters", () => {
    const result = deckNameSchema.safeParse("a".repeat(LIMITS.deckNameMax + 1));

    expect(result.success).toBe(false);
  });

  it("accepts name at max length", () => {
    const result = deckNameSchema.safeParse("a".repeat(LIMITS.deckNameMax));

    expect(result.success).toBe(true);
  });
});

describe("deckDescriptionSchema", () => {
  it("accepts valid description", () => {
    const result = deckDescriptionSchema.safeParse(
      "Flashcards for chapter 1 vocabulary",
    );

    expect(result.success).toBe(true);
  });

  it("accepts empty string", () => {
    const result = deckDescriptionSchema.safeParse("");

    expect(result.success).toBe(true);
  });

  it("accepts undefined", () => {
    const result = deckDescriptionSchema.safeParse(undefined);

    expect(result.success).toBe(true);
  });

  it("rejects description longer than max characters", () => {
    const result = deckDescriptionSchema.safeParse(
      "a".repeat(LIMITS.deckDescriptionMax + 1),
    );

    expect(result.success).toBe(false);
  });

  it("accepts description at max length", () => {
    const result = deckDescriptionSchema.safeParse(
      "a".repeat(LIMITS.deckDescriptionMax),
    );

    expect(result.success).toBe(true);
  });
});

describe("createDeckSchema", () => {
  it("accepts valid input with name and description", () => {
    const result = createDeckSchema.safeParse({
      subjectId: "subject-1",
      name: "Lecture Notes",
      description: "Notes from lectures",
    });

    expect(result.success).toBe(true);
  });

  it("accepts valid input with name only", () => {
    const result = createDeckSchema.safeParse({
      subjectId: "subject-1",
      name: "Lecture Notes",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing subjectId", () => {
    const result = createDeckSchema.safeParse({
      name: "Lecture Notes",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty subjectId", () => {
    const result = createDeckSchema.safeParse({
      subjectId: "",
      name: "Lecture Notes",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createDeckSchema.safeParse({
      subjectId: "subject-1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createDeckSchema.safeParse({
      subjectId: "subject-1",
      name: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than max characters", () => {
    const result = createDeckSchema.safeParse({
      subjectId: "subject-1",
      name: "a".repeat(LIMITS.deckNameMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects description longer than max characters", () => {
    const result = createDeckSchema.safeParse({
      subjectId: "subject-1",
      name: "Lecture Notes",
      description: "a".repeat(LIMITS.deckDescriptionMax + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe("editDeckSchema", () => {
  it("accepts valid input with name and description", () => {
    const result = editDeckSchema.safeParse({
      id: "deck-1",
      name: "Updated Name",
      description: "Updated description",
    });

    expect(result.success).toBe(true);
  });

  it("accepts valid input with name only", () => {
    const result = editDeckSchema.safeParse({
      id: "deck-1",
      name: "Updated Name",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = editDeckSchema.safeParse({
      name: "Updated Name",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = editDeckSchema.safeParse({
      id: "",
      name: "Updated Name",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = editDeckSchema.safeParse({
      id: "deck-1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = editDeckSchema.safeParse({
      id: "deck-1",
      name: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than max characters", () => {
    const result = editDeckSchema.safeParse({
      id: "deck-1",
      name: "a".repeat(LIMITS.deckNameMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects description longer than max characters", () => {
    const result = editDeckSchema.safeParse({
      id: "deck-1",
      name: "Updated Name",
      description: "a".repeat(LIMITS.deckDescriptionMax + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe("deleteDeckSchema", () => {
  it("accepts valid id", () => {
    const result = deleteDeckSchema.safeParse({
      id: "deck-1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = deleteDeckSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = deleteDeckSchema.safeParse({
      id: "",
    });

    expect(result.success).toBe(false);
  });
});
