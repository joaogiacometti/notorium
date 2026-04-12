import { describe, expect, it } from "vitest";
import {
  createNoteSchema,
  deleteNoteSchema,
  editNoteSchema,
} from "@/features/notes/validation";
import { LIMITS } from "@/lib/config/limits";

describe("createNoteSchema", () => {
  it("accepts valid input with required fields only", () => {
    const result = createNoteSchema.safeParse({
      title: "My Note",
      subjectId: "s1",
    });

    expect(result.success).toBe(true);
  });

  it("accepts valid input with optional content", () => {
    const result = createNoteSchema.safeParse({
      title: "My Note",
      subjectId: "s1",
      content: "Some content",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createNoteSchema.safeParse({ title: "", subjectId: "s1" });

    expect(result.success).toBe(false);
  });

  it("rejects title longer than max characters", () => {
    const result = createNoteSchema.safeParse({
      title: "a".repeat(LIMITS.noteTitleMax + 1),
      subjectId: "s1",
    });

    expect(result.success).toBe(false);
  });

  it("accepts title at exactly max characters", () => {
    const result = createNoteSchema.safeParse({
      title: "a".repeat(LIMITS.noteTitleMax),
      subjectId: "s1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects content longer than max characters", () => {
    const result = createNoteSchema.safeParse({
      title: "Valid",
      subjectId: "s1",
      content: "x".repeat(LIMITS.noteContentMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("accepts content at exactly max characters", () => {
    const result = createNoteSchema.safeParse({
      title: "Valid",
      subjectId: "s1",
      content: "x".repeat(LIMITS.noteContentMax),
    });

    expect(result.success).toBe(true);
  });

  it("accepts content at exactly max internal attachments", () => {
    const content = Array.from(
      { length: LIMITS.maxAttachmentsPerNote },
      (_, index) =>
        `<img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2F${index}.png">`,
    ).join("");

    const result = createNoteSchema.safeParse({
      title: "Valid",
      subjectId: "s1",
      content,
    });

    expect(result.success).toBe(true);
  });

  it("rejects content with too many internal attachments", () => {
    const content = Array.from(
      { length: LIMITS.maxAttachmentsPerNote + 1 },
      (_, index) =>
        `<img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2F${index}.png">`,
    ).join("");

    const result = createNoteSchema.safeParse({
      title: "Valid",
      subjectId: "s1",
      content,
    });

    expect(result.success).toBe(false);
  });
});

describe("editNoteSchema", () => {
  it("accepts valid edit input", () => {
    const result = editNoteSchema.safeParse({
      id: "n1",
      title: "Updated Title",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = editNoteSchema.safeParse({ title: "No ID" });

    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = editNoteSchema.safeParse({ id: "", title: "Title" });

    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = editNoteSchema.safeParse({ id: "n1", title: "" });

    expect(result.success).toBe(false);
  });
});

describe("deleteNoteSchema", () => {
  it("accepts valid id", () => {
    const result = deleteNoteSchema.safeParse({ id: "n1" });

    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = deleteNoteSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = deleteNoteSchema.safeParse({ id: "" });

    expect(result.success).toBe(false);
  });
});
