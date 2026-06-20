import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiConfigurationError } from "@/lib/ai/errors";

const resolveRequiredAiSettingsMock = vi.fn();
const consumeUserDailyRateLimitMock = vi.fn();
const answerLibraryQuestionMock = vi.fn();

vi.mock("@/lib/ai/config", () => ({
  resolveRequiredAiSettings: resolveRequiredAiSettingsMock,
}));

vi.mock("@/lib/rate-limit/user-rate-limit", () => ({
  consumeUserDailyRateLimit: consumeUserDailyRateLimitMock,
}));

vi.mock("@/features/library/ask-ai", () => ({
  answerLibraryQuestion: answerLibraryQuestionMock,
}));

const askInput = {
  userId: "user-1",
  sourceText: "Photosynthesis happens in chloroplasts.",
  messages: [{ role: "user" as const, content: "Where?" }],
};

describe("askAiAboutTextForUser", () => {
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

    const { askAiAboutTextForUser } = await import(
      "@/features/library/ask-ai-service"
    );

    const result = await askAiAboutTextForUser(askInput);

    expect(result).toEqual({
      success: false,
      errorCode: "library.ai.notConfigured",
    });
    expect(answerLibraryQuestionMock).not.toHaveBeenCalled();
  });

  it("returns the daily ask limit error before the provider call", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValueOnce({
      limited: true,
      remaining: 0,
      resetAt: "2026-05-01T00:00:00.000Z",
      errorCode: "limits.aiAskPerDay",
    });

    const { askAiAboutTextForUser } = await import(
      "@/features/library/ask-ai-service"
    );

    const result = await askAiAboutTextForUser(askInput);

    expect(result).toEqual({ success: false, errorCode: "limits.aiAskPerDay" });
    expect(answerLibraryQuestionMock).not.toHaveBeenCalled();
  });

  it("returns the answer from the AI when configured and under limit", async () => {
    answerLibraryQuestionMock.mockResolvedValueOnce("In the chloroplasts.");

    const { askAiAboutTextForUser } = await import(
      "@/features/library/ask-ai-service"
    );

    const result = await askAiAboutTextForUser(askInput);

    expect(result).toEqual({ success: true, answer: "In the chloroplasts." });
    expect(answerLibraryQuestionMock).toHaveBeenCalledWith({
      settings: {
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-or-v1-test",
      },
      sourceText: askInput.sourceText,
      messages: askInput.messages,
    });
  });

  it("maps unexpected provider failures to unavailable", async () => {
    answerLibraryQuestionMock.mockRejectedValueOnce(new Error("boom"));

    const { askAiAboutTextForUser } = await import(
      "@/features/library/ask-ai-service"
    );

    const result = await askAiAboutTextForUser(askInput);

    expect(result).toEqual({
      success: false,
      errorCode: "library.ai.unavailable",
    });
  });
});
