import { describe, expect, it } from "vitest";
import {
  bulkDeleteSubjectsSchema,
  createSubjectSchema,
  deleteSubjectSchema,
  editSubjectSchema,
} from "@/features/subjects/validation";
import { LIMITS } from "@/lib/config/limits";

describe("createSubjectSchema", () => {
  it("accepts valid input with required fields", () => {
    const result = createSubjectSchema.safeParse({
      name: "Mathematics",
      kind: "academic",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mathematics");
      expect(result.data.kind).toBe("academic");
    }
  });

  it("accepts the general kind", () => {
    const result = createSubjectSchema.safeParse({
      name: "Reading list",
      kind: "general",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    const result = createSubjectSchema.safeParse({
      name: "Mathematics",
      kind: "hobby",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing kind", () => {
    const result = createSubjectSchema.safeParse({ name: "Mathematics" });

    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createSubjectSchema.safeParse({
      name: "",
      kind: "academic",
    });

    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    const result = createSubjectSchema.safeParse({
      name: "   ",
      kind: "academic",
    });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than max characters", () => {
    const result = createSubjectSchema.safeParse({
      name: "a".repeat(LIMITS.subjectNameMax + 1),
      kind: "academic",
    });

    expect(result.success).toBe(false);
  });
});

describe("editSubjectSchema", () => {
  it("requires an id field", () => {
    const result = editSubjectSchema.safeParse({
      name: "Math",
      kind: "academic",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid edit input", () => {
    const result = editSubjectSchema.safeParse({
      id: "subject-1",
      name: "Updated Name",
      kind: "general",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("general");
    }
  });

  it("rejects whitespace-only edit name", () => {
    const result = editSubjectSchema.safeParse({
      id: "subject-1",
      name: "   ",
      kind: "academic",
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

describe("bulk delete subject schema", () => {
  it("rejects empty ids", () => {
    expect(bulkDeleteSubjectsSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it("accepts non-empty ids", () => {
    const input = { ids: ["subject-1"] };

    expect(bulkDeleteSubjectsSchema.safeParse(input).success).toBe(true);
  });
});
