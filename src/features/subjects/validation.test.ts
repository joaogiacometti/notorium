import { describe, expect, it } from "vitest";
import {
  archiveSubjectSchema,
  createSubjectSchema,
  deleteSubjectSchema,
  editSubjectSchema,
  restoreSubjectSchema,
} from "@/features/subjects/validation";
import { LIMITS } from "@/lib/config/limits";

describe("createSubjectSchema", () => {
  it("accepts valid input with required fields only", () => {
    const result = createSubjectSchema.safeParse({ name: "Mathematics" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mathematics");
    }
  });

  it("accepts valid input with all fields", () => {
    const result = createSubjectSchema.safeParse({
      name: "Physics",
      description: "Intro to physics",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createSubjectSchema.safeParse({ name: "" });

    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only name", () => {
    const result = createSubjectSchema.safeParse({ name: "   " });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than max characters", () => {
    const result = createSubjectSchema.safeParse({
      name: "a".repeat(LIMITS.subjectNameMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects description longer than max characters", () => {
    const result = createSubjectSchema.safeParse({
      name: "Valid",
      description: "x".repeat(LIMITS.subjectDescriptionMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("accepts description at exactly max characters", () => {
    const result = createSubjectSchema.safeParse({
      name: "Valid",
      description: "x".repeat(LIMITS.subjectDescriptionMax),
    });

    expect(result.success).toBe(true);
  });
});

describe("editSubjectSchema", () => {
  it("requires an id field", () => {
    const result = editSubjectSchema.safeParse({ name: "Math" });

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

describe("archiveSubjectSchema", () => {
  it("requires a non-empty id", () => {
    expect(archiveSubjectSchema.safeParse({}).success).toBe(false);
    expect(archiveSubjectSchema.safeParse({ id: "" }).success).toBe(false);
  });

  it("accepts a valid id", () => {
    expect(archiveSubjectSchema.safeParse({ id: "subject-1" }).success).toBe(
      true,
    );
  });
});

describe("restoreSubjectSchema", () => {
  it("requires a non-empty id", () => {
    expect(restoreSubjectSchema.safeParse({}).success).toBe(false);
    expect(restoreSubjectSchema.safeParse({ id: "" }).success).toBe(false);
  });

  it("accepts a valid id", () => {
    expect(restoreSubjectSchema.safeParse({ id: "subject-1" }).success).toBe(
      true,
    );
  });
});
