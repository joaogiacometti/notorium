import { describe, expect, it } from "vitest";
import {
  createFolderSchema,
  deleteFolderSchema,
  editFolderSchema,
} from "@/features/folders/validation";
import { LIMITS } from "@/lib/config/limits";

describe("createFolderSchema", () => {
  it("accepts valid input with required fields", () => {
    const result = createFolderSchema.safeParse({
      name: "Mathematics",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mathematics");
    }
  });

  it("accepts a :: path when each segment is valid", () => {
    const result = createFolderSchema.safeParse({
      name: `${"a".repeat(LIMITS.folderNameMax)}::Child`,
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createFolderSchema.safeParse({
      name: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    const result = createFolderSchema.safeParse({
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than max characters", () => {
    const result = createFolderSchema.safeParse({
      name: "a".repeat(LIMITS.folderNameMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty :: path segments", () => {
    const result = createFolderSchema.safeParse({
      name: "Math::::Integrals",
    });

    expect(result.success).toBe(false);
  });
});

describe("editFolderSchema", () => {
  it("requires an id field", () => {
    const result = editFolderSchema.safeParse({
      name: "Math",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid edit input", () => {
    const result = editFolderSchema.safeParse({
      id: "folder-1",
      name: "Updated Name",
    });

    expect(result.success).toBe(true);
  });

  it("rejects whitespace-only edit name", () => {
    const result = editFolderSchema.safeParse({
      id: "folder-1",
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects the reserved path delimiter in an edited name", () => {
    const result = editFolderSchema.safeParse({
      id: "folder-1",
      name: "Math::Calculus",
    });

    expect(result.success).toBe(false);
  });
});

describe("deleteFolderSchema", () => {
  it("requires an id", () => {
    const result = deleteFolderSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = deleteFolderSchema.safeParse({ id: "" });

    expect(result.success).toBe(false);
  });

  it("accepts valid id", () => {
    const result = deleteFolderSchema.safeParse({ id: "folder-1" });

    expect(result.success).toBe(true);
  });
});
