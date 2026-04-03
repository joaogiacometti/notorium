import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/config/limits";
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

  it("accepts string at exactly max characters", () => {
    const result = searchQuerySchema.safeParse(
      "a".repeat(LIMITS.searchQueryMax),
    );

    expect(result.success).toBe(true);
  });

  it("rejects string longer than max characters", () => {
    const result = searchQuerySchema.safeParse(
      "a".repeat(LIMITS.searchQueryMax + 1),
    );

    expect(result.success).toBe(false);
  });
});
