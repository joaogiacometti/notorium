import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveAiSettingsMock = vi.fn();
const consumeUserDailyRateLimitMock = vi.fn();
const improveFlashcardBackContentMock = vi.fn();

vi.mock("@/lib/ai/config", () => ({
  resolveAiSettings: resolveAiSettingsMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: consumeUserDailyRateLimitMock,
}));

vi.mock("@/features/flashcards/ai", () => ({
  improveFlashcardBackContent: improveFlashcardBackContentMock,
}));

const settings = {
  model: "openai/gpt-4.1-mini",
  apiKey: "sk-or-v1-test",
  reasoningEffort: "none" as const,
};

const improveInput = {
  userId: "user-1",
  front: "<p>What is ATP?</p>",
  currentBack: "<p>Energy</p>",
};

describe("flashcards ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    resolveAiSettingsMock.mockReturnValue(settings);
    consumeUserDailyRateLimitMock.mockResolvedValue({
      limited: false,
      remaining: 100,
      resetAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("returns notConfigured when AI env settings are missing", async () => {
    resolveAiSettingsMock.mockReturnValueOnce(null);

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser(improveInput);

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
    expect(improveFlashcardBackContentMock).not.toHaveBeenCalled();
  });

  it("returns AI back-generation limit error before provider call", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValueOnce({
      limited: true,
      remaining: 0,
      resetAt: "2026-05-01T00:00:00.000Z",
      errorCode: "limits.aiBackGenerationPerDay",
    });

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser(improveInput);

    expect(result).toEqual({
      success: false,
      errorCode: "limits.aiBackGenerationPerDay",
    });
    expect(improveFlashcardBackContentMock).not.toHaveBeenCalled();
  });

  it("improves back content with global AI settings", async () => {
    improveFlashcardBackContentMock.mockResolvedValueOnce("<p>Energy.</p>");

    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await improveFlashcardBackForUser({
      ...improveInput,
      subjectName: "Biology",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>Energy.</p>",
    });
    expect(improveFlashcardBackContentMock).toHaveBeenCalledWith({
      settings,
      subjectName: "Biology",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>Energy</p>",
    });
  });
});
