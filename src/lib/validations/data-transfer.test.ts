import { describe, expect, it } from "vitest";
import { importDataSchema } from "@/lib/validations/data-transfer";

const validAssessment = {
  title: "Midterm",
  description: null,
  type: "exam",
  status: "pending",
  dueDate: null,
  score: null,
  weight: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const validNote = {
  title: "Lecture 1",
  content: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const validSubject = {
  name: "Mathematics",
  description: null,
  totalClasses: null,
  maxMisses: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  notes: [],
  attendanceMisses: [],
  assessments: [],
};

const validPayload = {
  version: 1,
  exportedAt: "2026-03-01T00:00:00.000Z",
  subjects: [],
};

describe("importDataSchema", () => {
  it("accepts a minimal valid payload (no subjects)", () => {
    const result = importDataSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it("accepts a full subject with notes, assessments, and attendance", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          notes: [validNote],
          assessments: [validAssessment],
          attendanceMisses: [{ missDate: "2026-02-10" }],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects wrong version number", () => {
    const result = importDataSchema.safeParse({ ...validPayload, version: 2 });

    expect(result.success).toBe(false);
  });

  it("rejects subject with empty name", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [{ ...validSubject, name: "" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects note with empty title", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          notes: [{ ...validNote, title: "" }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects assessment with invalid type", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          assessments: [{ ...validAssessment, type: "quiz" }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects assessment with invalid status", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          assessments: [{ ...validAssessment, status: "cancelled" }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing exportedAt", () => {
    const { exportedAt: _, ...rest } = validPayload;
    const result = importDataSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });
});
