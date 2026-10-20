import { describe, expect, it } from "vitest";
import {
  createSubjectSchema,
  deleteSubjectSchema,
  editSubjectSchema,
} from "@/features/subjects/validation";
import { LIMITS } from "@/lib/config/limits";

describe("createSubjectSchema", () => {
  it("accepts valid input with required fields", () => {
    const result = createSubjectSchema.safeParse({
      name: "Mathematics",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mathematics");
    }
  });

  it("accepts a :: path when each segment is valid", () => {
    const result = createSubjectSchema.safeParse({
      name: `${"a".repeat(LIMITS.subjectNameMax)}::Child`,
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createSubjectSchema.safeParse({
      name: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    const result = createSubjectSchema.safeParse({
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than max characters", () => {
    const result = createSubjectSchema.safeParse({
      name: "a".repeat(LIMITS.subjectNameMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty :: path segments", () => {
    const result = createSubjectSchema.safeParse({
      name: "Math::::Integrals",
    });

    expect(result.success).toBe(false);
  });
});

describe("editSubjectSchema", () => {
  it("requires an id field", () => {
    const result = editSubjectSchema.safeParse({
      name: "Math",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid edit input", () => {
    const result = editSubjectSchema.safeParse({
      id: "subject-1",
      name: "Updated Name",
    });

    expect(result.success).toBe(true);
  });

  it("rejects whitespace-only edit name", () => {
    const result = editSubjectSchema.safeParse({
      id: "subject-1",
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects the reserved path delimiter in an edited name", () => {
    const result = editSubjectSchema.safeParse({
      id: "subject-1",
      name: "Math::Calculus",
    });

    expect(result.success).toBe(false);
  });
});

describe("deleteSubjectSchema", () => {
  it("requires an id", () => {
    const result = deleteSubjectSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = deleteSubjectSchema.safeParse({ id: "" });

    expect(result.success).toBe(false);
  });

  it("accepts valid id", () => {
    const result = deleteSubjectSchema.safeParse({ id: "subject-1" });

    expect(result.success).toBe(true);
  });
});
