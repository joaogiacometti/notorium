import { describe, expect, it } from "vitest";
import {
  createNoteSchema,
  deleteNoteSchema,
  editNoteSchema,
  noteAttachmentMaxSizeBytes,
  validateNoteAttachmentFile,
} from "@/lib/validations/notes";

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

  it("rejects title longer than 200 characters", () => {
    const result = createNoteSchema.safeParse({
      title: "a".repeat(201),
      subjectId: "s1",
    });

    expect(result.success).toBe(false);
  });

  it("accepts title at exactly 200 characters", () => {
    const result = createNoteSchema.safeParse({
      title: "a".repeat(200),
      subjectId: "s1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects content longer than 10000 characters", () => {
    const result = createNoteSchema.safeParse({
      title: "Valid",
      subjectId: "s1",
      content: "x".repeat(10001),
    });

    expect(result.success).toBe(false);
  });

  it("accepts content at exactly 10000 characters", () => {
    const result = createNoteSchema.safeParse({
      title: "Valid",
      subjectId: "s1",
      content: "x".repeat(10000),
    });

    expect(result.success).toBe(true);
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

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("validateNoteAttachmentFile", () => {
  it("returns null for a valid JPEG under 2 MB", () => {
    const file = makeFile("photo.jpg", "image/jpeg", 1024);

    expect(validateNoteAttachmentFile(file)).toBeNull();
  });

  it("returns null for a valid PNG under 2 MB", () => {
    const file = makeFile("photo.png", "image/png", 500 * 1024);

    expect(validateNoteAttachmentFile(file)).toBeNull();
  });

  it("returns an error for an unsupported MIME type", () => {
    const file = makeFile("document.pdf", "application/pdf", 1024);

    expect(validateNoteAttachmentFile(file)).not.toBeNull();
  });

  it("returns an error when file exceeds 2 MB", () => {
    const file = makeFile(
      "big.jpg",
      "image/jpeg",
      noteAttachmentMaxSizeBytes + 1,
    );

    expect(validateNoteAttachmentFile(file)).not.toBeNull();
  });

  it("returns null for a file at exactly the size limit", () => {
    const file = makeFile(
      "exact.jpg",
      "image/jpeg",
      noteAttachmentMaxSizeBytes,
    );

    expect(validateNoteAttachmentFile(file)).toBeNull();
  });
});
