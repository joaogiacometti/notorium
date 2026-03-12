import { describe, expect, it } from "vitest";
import {
  createUserAiSettingsSchema,
  updateAccountSchema,
  updateUserAiSettingsSchema,
} from "@/features/account/validation";

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

  it("rejects name shorter than 2 characters", () => {
    const result = updateAccountSchema.safeParse({ name: "A" });

    expect(result.success).toBe(false);
  });

  it("rejects name that becomes too short after trimming", () => {
    const result = updateAccountSchema.safeParse({ name: " A " });

    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = updateAccountSchema.safeParse({ name: "a".repeat(101) });

    expect(result.success).toBe(false);
  });

  it("accepts name at exactly 2 characters", () => {
    const result = updateAccountSchema.safeParse({ name: "Al" });

    expect(result.success).toBe(true);
  });

  it("accepts name at exactly 100 characters", () => {
    const result = updateAccountSchema.safeParse({ name: "a".repeat(100) });

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

describe("updateUserAiSettingsSchema", () => {
  it("accepts a valid model and blank api key for existing settings", () => {
    const result = updateUserAiSettingsSchema.safeParse({
      model: " openai/gpt-4.1-mini ",
      apiKey: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe("openai/gpt-4.1-mini");
      expect(result.data.apiKey).toBe("");
    }
  });

  it("rejects empty model", () => {
    const result = updateUserAiSettingsSchema.safeParse({
      model: "   ",
      apiKey: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects overlong model", () => {
    const result = updateUserAiSettingsSchema.safeParse({
      model: "a".repeat(151),
      apiKey: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("createUserAiSettingsSchema", () => {
  it("requires an api key when creating settings", () => {
    const result = createUserAiSettingsSchema.safeParse({
      model: "openai/gpt-4.1-mini",
      apiKey: " ",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid initial settings", () => {
    const result = createUserAiSettingsSchema.safeParse({
      model: "openai/gpt-4.1-mini",
      apiKey: " sk-or-v1-secret ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiKey).toBe("sk-or-v1-secret");
    }
  });
});
