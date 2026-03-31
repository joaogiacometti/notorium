import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiConfigurationError, AiStoredCredentialError } from "@/lib/ai/errors";

const resolveRequiredUserAiSettingsMock = vi.fn();
const generateFlashcardBackContentMock = vi.fn();
const improveFlashcardBackContentMock = vi.fn();

vi.mock("@/features/ai/settings", () => ({
  resolveRequiredUserAiSettings: resolveRequiredUserAiSettingsMock,
}));

vi.mock("@/features/flashcards/ai", () => ({
  generateFlashcardBackContent: generateFlashcardBackContentMock,
  improveFlashcardBackContent: improveFlashcardBackContentMock,
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

describe("improveFlashcardBackForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns notConfigured without consuming quota when settings are missing", async () => {
    resolveRequiredUserAiSettingsMock.mockRejectedValueOnce(
      new AiConfigurationError(),
    );

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
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

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
  });

  it("improves content after settings resolve successfully", async () => {
    resolveRequiredUserAiSettingsMock.mockResolvedValueOnce({
      provider: "openrouter",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-or-v1-test",
    });
    improveFlashcardBackContentMock.mockResolvedValueOnce(
      "<p>ATP stores and transfers cellular energy through phosphate bonds.</p>",
    );

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>ATP stores and transfers cellular energy through phosphate bonds.</p>",
    });
  });

  it("returns unavailable for non-configuration failures", async () => {
    resolveRequiredUserAiSettingsMock.mockRejectedValueOnce(
      new Error("db down"),
    );

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      userId: "user-1",
      subjectName: "Biology",
      front: "What is ATP?",
      currentBack: "ATP stores energy.",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.unavailable",
    });
  });
});
