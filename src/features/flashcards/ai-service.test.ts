import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiConfigurationError, AiStoredCredentialError } from "@/lib/ai/errors";

const resolveRequiredUserAiSettingsMock = vi.fn();
const generateFlashcardBackContentMock = vi.fn();

vi.mock("@/features/ai/settings", () => ({
  resolveRequiredUserAiSettings: resolveRequiredUserAiSettingsMock,
}));

vi.mock("@/features/flashcards/ai", () => ({
  generateFlashcardBackContent: generateFlashcardBackContentMock,
}));

describe("generateFlashcardBackForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notConfigured without consuming quota when settings are missing", async () => {
    resolveRequiredUserAiSettingsMock.mockRejectedValueOnce(
      new AiConfigurationError(),
    );

    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
    expect(generateFlashcardBackContentMock).not.toHaveBeenCalled();
  });

  it("returns notConfigured when settings cannot be decrypted", async () => {
    resolveRequiredUserAiSettingsMock.mockRejectedValueOnce(
      new AiStoredCredentialError(),
    );

    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
  });

  it("generates content after settings resolve successfully", async () => {
    const calls: string[] = [];

    resolveRequiredUserAiSettingsMock.mockImplementationOnce(async () => {
      calls.push("resolve");
      return {
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-or-v1-test",
      };
    });
    generateFlashcardBackContentMock.mockImplementationOnce(async () => {
      calls.push("generate");
      return "<p>ATP stores and transfers cellular energy.</p>";
    });

    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>ATP stores and transfers cellular energy.</p>",
    });
    expect(calls).toEqual(["resolve", "generate"]);
  });

  it("returns unavailable for non-configuration failures", async () => {
    resolveRequiredUserAiSettingsMock.mockRejectedValueOnce(
      new Error("db down"),
    );

    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.unavailable",
    });
  });

  it("returns unavailable for provider failures after valid resolution", async () => {
    resolveRequiredUserAiSettingsMock.mockImplementationOnce(async () => {
      return {
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-or-v1-test",
      };
    });
    generateFlashcardBackContentMock.mockRejectedValueOnce(
      new Error("provider error"),
    );

    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.unavailable",
    });
  });
});
