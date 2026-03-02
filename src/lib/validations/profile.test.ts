import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/lib/validations/profile";

describe("updateProfileSchema", () => {
  it("accepts valid name", () => {
    const result = updateProfileSchema.safeParse({ name: "Alice" });

    expect(result.success).toBe(true);
  });

  it("trims whitespace from name", () => {
    const result = updateProfileSchema.safeParse({ name: "  Alice  " });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Alice");
    }
  });

  it("rejects name shorter than 2 characters", () => {
    const result = updateProfileSchema.safeParse({ name: "A" });

    expect(result.success).toBe(false);
  });

  it("rejects name that becomes too short after trimming", () => {
    const result = updateProfileSchema.safeParse({ name: " A " });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = updateProfileSchema.safeParse({ name: "a".repeat(101) });

    expect(result.success).toBe(false);
  });

  it("accepts name at exactly 2 characters", () => {
    const result = updateProfileSchema.safeParse({ name: "Al" });

    expect(result.success).toBe(true);
  });

  it("accepts name at exactly 100 characters", () => {
    const result = updateProfileSchema.safeParse({ name: "a".repeat(100) });

    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = updateProfileSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = updateProfileSchema.safeParse({ name: "" });

    expect(result.success).toBe(false);
  });
});
