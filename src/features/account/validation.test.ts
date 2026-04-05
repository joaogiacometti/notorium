import { describe, expect, it } from "vitest";
import { updateAccountSchema } from "@/features/account/validation";
import { LIMITS } from "@/lib/config/limits";

describe("updateAccountSchema", () => {
  it("accepts valid name", () => {
    const result = updateAccountSchema.safeParse({ name: "Alice" });

    expect(result.success).toBe(true);
  });

  it("trims whitespace from name", () => {
    const result = updateAccountSchema.safeParse({ name: "  Alice  " });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Alice");
    }
  });

  it("rejects name shorter than minimum", () => {
    const result = updateAccountSchema.safeParse({
      name: "a".repeat(LIMITS.authNameMin - 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects name that becomes too short after trimming", () => {
    const result = updateAccountSchema.safeParse({ name: " A " });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than maximum", () => {
    const result = updateAccountSchema.safeParse({
      name: "a".repeat(LIMITS.accountNameMax + 1),
    });

    expect(result.success).toBe(false);
  });

  it("accepts name at exactly minimum characters", () => {
    const result = updateAccountSchema.safeParse({
      name: "a".repeat(LIMITS.authNameMin),
    });

    expect(result.success).toBe(true);
  });

  it("accepts name at exactly maximum characters", () => {
    const result = updateAccountSchema.safeParse({
      name: "a".repeat(LIMITS.accountNameMax),
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = updateAccountSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = updateAccountSchema.safeParse({ name: "" });

    expect(result.success).toBe(false);
  });
});
