import { describe, expect, it } from "vitest";
import {
  createUserAiSettingsSchema,
  updateUserAiSettingsSchema,
} from "@/features/ai/validation";
import { LIMITS } from "@/lib/config/limits";

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

  it("rejects model longer than max characters", () => {
    const result = updateUserAiSettingsSchema.safeParse({
      model: "a".repeat(LIMITS.accountAiModelMax + 1),
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
