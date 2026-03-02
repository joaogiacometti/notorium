import { describe, expect, it } from "vitest";
import { searchQuerySchema } from "@/lib/validations/search";

describe("searchQuerySchema", () => {
  it("accepts a valid search string", () => {
    const result = searchQuerySchema.safeParse("calculus notes");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("calculus notes");
    }
  });

  it("trims whitespace", () => {
    const result = searchQuerySchema.safeParse("  hello  ");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("hello");
    }
  });

  it("defaults to empty string when undefined", () => {
    const result = searchQuerySchema.safeParse(undefined);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("");
    }
  });

  it("accepts empty string", () => {
    const result = searchQuerySchema.safeParse("");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("");
    }
  });

  it("accepts string at exactly 200 characters", () => {
    const result = searchQuerySchema.safeParse("a".repeat(200));

    expect(result.success).toBe(true);
  });

  it("rejects string longer than 200 characters", () => {
    const result = searchQuerySchema.safeParse("a".repeat(201));

    expect(result.success).toBe(false);
  });
});
