import { describe, expect, it } from "vitest";
import {
  archiveSubjectSchema,
  createSubjectSchema,
  deleteSubjectSchema,
  editSubjectSchema,
  restoreSubjectSchema,
} from "@/lib/validations/subjects";

describe("createSubjectSchema", () => {
  it("accepts valid input with required fields only", () => {
    const result = createSubjectSchema.safeParse({ name: "Mathematics" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Mathematics");
      expect(result.data.notesEnabled).toBe(true);
      expect(result.data.gradesEnabled).toBe(true);
      expect(result.data.attendanceEnabled).toBe(true);
      expect(result.data.flashcardsEnabled).toBe(true);
    }
  });

  it("accepts valid input with all fields", () => {
    const result = createSubjectSchema.safeParse({
      name: "Physics",
      description: "Intro to physics",
      notesEnabled: false,
      gradesEnabled: true,
      attendanceEnabled: false,
      flashcardsEnabled: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notesEnabled).toBe(false);
      expect(result.data.attendanceEnabled).toBe(false);
      expect(result.data.flashcardsEnabled).toBe(false);
    }
  });

  it("rejects empty name", () => {
    const result = createSubjectSchema.safeParse({ name: "" });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = createSubjectSchema.safeParse({ name: "a".repeat(101) });

    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 characters", () => {
    const result = createSubjectSchema.safeParse({
      name: "Valid",
      description: "x".repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 500 characters", () => {
    const result = createSubjectSchema.safeParse({
      name: "Valid",
      description: "x".repeat(500),
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
