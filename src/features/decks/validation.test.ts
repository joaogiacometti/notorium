import { describe, expect, it } from "vitest";
import {
  createDeckSchema,
  deckNameSchema,
  deleteDeckSchema,
  editDeckSchema,
  moveDeckSchema,
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
});

describe("createDeckSchema", () => {
  it("accepts valid input with name", () => {
    const result = createDeckSchema.safeParse({
      name: "Lecture Notes",
    });

    expect(result.success).toBe(true);
  });

  it("accepts valid input with parentDeckId", () => {
    const result = createDeckSchema.safeParse({
      parentDeckId: "deck-1",
      name: "Child Deck",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createDeckSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects empty parentDeckId when provided", () => {
    const result = createDeckSchema.safeParse({
      parentDeckId: "",
      name: "Lecture Notes",
    });

    expect(result.success).toBe(false);
  });
});

describe("editDeckSchema", () => {
  it("accepts valid input", () => {
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
});

describe("deleteDeckSchema", () => {
  it("accepts valid id", () => {
    const result = deleteDeckSchema.safeParse({ id: "deck-1" });

    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = deleteDeckSchema.safeParse({ id: "" });

    expect(result.success).toBe(false);
  });
});

describe("moveDeckSchema", () => {
  it("accepts valid input with parentDeckId", () => {
    const result = moveDeckSchema.safeParse({
      id: "deck-1",
      parentDeckId: "deck-2",
    });

    expect(result.success).toBe(true);
  });

  it("accepts clearing parentDeckId", () => {
    const result = moveDeckSchema.safeParse({
      id: "deck-1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty parentDeckId", () => {
    const result = moveDeckSchema.safeParse({
      id: "deck-1",
      parentDeckId: "",
    });

    expect(result.success).toBe(false);
  });
});
