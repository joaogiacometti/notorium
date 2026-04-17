import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiConfigurationError } from "@/lib/ai/errors";

const resolveRequiredAiSettingsMock = vi.fn();
const consumeUserDailyRateLimitMock = vi.fn();
const generateFlashcardBackContentMock = vi.fn();
const improveFlashcardBackContentMock = vi.fn();
const generateFlashcardsFromTextMock = vi.fn();
const validateFlashcardsWithAiMock = vi.fn();

vi.mock("@/lib/ai/config", () => ({
  resolveRequiredAiSettings: resolveRequiredAiSettingsMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: consumeUserDailyRateLimitMock,
}));

vi.mock("@/features/flashcards/ai", () => ({
  generateFlashcardBackContent: generateFlashcardBackContentMock,
  improveFlashcardBackContent: improveFlashcardBackContentMock,
  generateFlashcardsFromText: generateFlashcardsFromTextMock,
  validateFlashcardsWithAi: validateFlashcardsWithAiMock,
}));

describe("flashcards ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveRequiredAiSettingsMock.mockReturnValue({
      provider: "openrouter",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-or-v1-test",
    });
    consumeUserDailyRateLimitMock.mockResolvedValue({
      limited: false,
      remaining: 100,
      resetAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("returns notConfigured when AI env settings are missing", async () => {
    resolveRequiredAiSettingsMock.mockImplementationOnce(() => {
      throw new AiConfigurationError();
    });

    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardBackForUser({
      userId: "user-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
    expect(generateFlashcardBackContentMock).not.toHaveBeenCalled();
  });

  it("returns AI back-generation limit error before provider call", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValueOnce({
      limited: true,
      remaining: 0,
      resetAt: "2026-05-01T00:00:00.000Z",
      errorCode: "limits.aiBackGenerationPerDay",
    });

    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardBackForUser({
      userId: "user-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.aiBackGenerationPerDay",
    });
    expect(generateFlashcardBackContentMock).not.toHaveBeenCalled();
  });

  it("generates back content with global AI settings", async () => {
    generateFlashcardBackContentMock.mockResolvedValueOnce("<p>Energy.</p>");

    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardBackForUser({
      userId: "user-1",
      front: "<p>What is ATP?</p>",
      deckName: "Biology",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>Energy.</p>",
    });
    expect(generateFlashcardBackContentMock).toHaveBeenCalledWith({
      settings: {
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-or-v1-test",
      },
      subjectName: undefined,
      deckName: "Biology",
      front: "<p>What is ATP?</p>",
    });
  });

  it("returns generation limit error for multi-card generation", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValueOnce({
      limited: true,
      remaining: 0,
      resetAt: "2026-05-01T00:00:00.000Z",
      errorCode: "limits.aiFlashcardGenerationPerDay",
    });

    const { generateFlashcardsForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardsForUser({
      userId: "user-1",
      text: "sample",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.aiFlashcardGenerationPerDay",
    });
    expect(generateFlashcardsFromTextMock).not.toHaveBeenCalled();
  });

  it("returns validation limit error for AI validation", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValueOnce({
      limited: true,
      remaining: 0,
      resetAt: "2026-05-01T00:00:00.000Z",
      errorCode: "limits.aiValidationPerDay",
    });

    const { validateFlashcardsForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await validateFlashcardsForUser({
      userId: "user-1",
      flashcards: [
        {
          id: "f1",
          front: "<p>Front</p>",
          back: "<p>Back</p>",
          deckName: "Biology",
        },
      ],
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.aiValidationPerDay",
    });
    expect(validateFlashcardsWithAiMock).not.toHaveBeenCalled();
  });

  it("returns noCards without touching limits", async () => {
    const { validateFlashcardsForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await validateFlashcardsForUser({
      userId: "user-1",
      flashcards: [],
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.validation.noCards",
    });
    expect(consumeUserDailyRateLimitMock).not.toHaveBeenCalled();
  });
});
