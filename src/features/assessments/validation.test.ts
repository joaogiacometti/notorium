import { describe, expect, it } from "vitest";
import {
  createAssessmentSchema,
  deleteAssessmentSchema,
  editAssessmentSchema,
  planningAssessmentsQuerySchema,
} from "@/features/assessments/validation";
import { LIMITS } from "@/lib/config/limits";

describe("createAssessmentSchema", () => {
  it("accepts valid input with required fields only", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Midterm Exam",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("other");
      expect(result.data.status).toBe("pending");
    }
  });

  it("accepts valid input with all optional fields", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Final",
      description: "A final exam",
      type: "exam",
      status: "completed",
      dueDate: "2026-06-15",
      score: 95,
      weight: 30,
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects title longer than max characters", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "a".repeat(LIMITS.assessmentTitleMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const invalid = ["2026/06/15", "15-06-2026", "June 15", "not-a-date"];

    for (const dueDate of invalid) {
      const result = createAssessmentSchema.safeParse({
        subjectId: "s1",
        title: "Test",
        dueDate,
      });

      expect(result.success, `should reject "${dueDate}"`).toBe(false);
    }
  });

  it("accepts valid yyyy-MM-dd date format", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Test",
      dueDate: "2026-12-31",
    });

    expect(result.success).toBe(true);
  });

  it("rejects negative score", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Test",
      score: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects score above max", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Test",
      score: LIMITS.assessmentScoreMax + 1,
    });

    expect(result.success).toBe(false);
  });

  it("accepts score at boundaries", () => {
    const zero = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Test",
      score: 0,
    });
    const max = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Test",
      score: LIMITS.assessmentScoreMax,
    });

    expect(zero.success).toBe(true);
    expect(max.success).toBe(true);
  });

  it("rejects negative weight", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Test",
      weight: -5,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid assessment type", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Test",
      type: "quiz",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = createAssessmentSchema.safeParse({
      subjectId: "s1",
      title: "Test",
      status: "cancelled",
    });

    expect(result.success).toBe(false);
  });
});

describe("editAssessmentSchema", () => {
  it("requires id field", () => {
    const result = editAssessmentSchema.safeParse({
      title: "Updated",
      type: "exam",
      status: "pending",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid edit input", () => {
    const result = editAssessmentSchema.safeParse({
      id: "a1",
      title: "Updated Title",
      type: "exam",
      status: "completed",
      score: 88,
    });

    expect(result.success).toBe(true);
  });
});

describe("deleteAssessmentSchema", () => {
  it("requires id", () => {
    const result = deleteAssessmentSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts valid id", () => {
    const result = deleteAssessmentSchema.safeParse({ id: "a1" });

    expect(result.success).toBe(true);
  });
});

describe("planningAssessmentsQuerySchema", () => {
  it("accepts valid page and filter input", () => {
    const result = planningAssessmentsQuerySchema.safeParse({
      pageIndex: 0,
      pageSize: 25,
      search: "math",
      subjectId: "subject-1",
      statusFilter: "overdue",
      typeFilter: "exam",
      sortBy: "smart",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid paging and filter values", () => {
    const result = planningAssessmentsQuerySchema.safeParse({
      pageIndex: -1,
      pageSize: 0,
      statusFilter: "archived",
      typeFilter: "quiz",
      sortBy: "random",
    });

    expect(result.success).toBe(false);
  });
});
