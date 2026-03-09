import { describe, expect, it } from "vitest";
import {
  attendanceSettingsSchema,
  deleteMissSchema,
  recordMissSchema,
} from "@/features/attendance/validation";

describe("attendanceSettingsSchema", () => {
  it("accepts valid input", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 40,
      maxMisses: 10,
    });

    expect(result.success).toBe(true);
  });

  it("accepts boundary values (totalClasses=1, maxMisses=0)", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 1,
      maxMisses: 0,
    });

    expect(result.success).toBe(true);
  });

  it("accepts boundary values (totalClasses=365, maxMisses=365)", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 365,
      maxMisses: 365,
    });

    expect(result.success).toBe(true);
  });

  it("rejects totalClasses below 1", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 0,
      maxMisses: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects totalClasses above 365", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 366,
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

  it("rejects maxMisses above 365", () => {
    const result = attendanceSettingsSchema.safeParse({
      subjectId: "s1",
      totalClasses: 10,
      maxMisses: 366,
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
