import { describe, expect, it } from "vitest";
import {
  attendanceSettingsSchema,
  deleteMissSchema,
  recordMissSchema,
} from "@/features/attendance/validation";
import { LIMITS } from "@/lib/config/limits";

describe("attendanceSettingsSchema", () => {
  it("accepts valid input", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 40,
      maxMisses: 10,
    });

    expect(result.success).toBe(true);
  });

  it("accepts boundary values at minimum", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 1,
      maxMisses: 0,
    });

    expect(result.success).toBe(true);
  });

  it("accepts boundary values at maximum", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: LIMITS.attendanceTotalClassesMax,
      maxMisses: LIMITS.attendanceMaxMissesMax,
    });

    expect(result.success).toBe(true);
  });

  it("rejects totalClasses below minimum", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 0,
      maxMisses: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects totalClasses above maximum", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: LIMITS.attendanceTotalClassesMax + 1,
      maxMisses: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative maxMisses", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 10,
      maxMisses: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects maxMisses above maximum", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 10,
      maxMisses: LIMITS.attendanceMaxMissesMax + 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-integer totalClasses", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 10.5,
      maxMisses: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-integer maxMisses", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 10,
      maxMisses: 2.5,
    });

    expect(result.success).toBe(false);
  });
});

describe("recordMissSchema", () => {
  it("accepts valid input", () => {
    const result = recordMissSchema.safeParse({
      subjectId: "s1",
      missDate: "2026-03-01",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty missDate", () => {
    const result = recordMissSchema.safeParse({
      subjectId: "s1",
      missDate: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing missDate", () => {
    const result = recordMissSchema.safeParse({ subjectId: "s1" });

    expect(result.success).toBe(false);
  });
});

describe("deleteMissSchema", () => {
  it("accepts valid id", () => {
    const result = deleteMissSchema.safeParse({ id: "m1" });

    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = deleteMissSchema.safeParse({ id: "" });

    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = deleteMissSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
