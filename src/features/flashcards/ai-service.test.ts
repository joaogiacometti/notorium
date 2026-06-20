import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiConfigurationError } from "@/lib/ai/errors";

const resolveRequiredAiSettingsMock = vi.fn();
const consumeUserDailyRateLimitMock = vi.fn();
const generateFlashcardBackContentMock = vi.fn();
const improveFlashcardBackContentMock = vi.fn();
const generateFlashcardsFromTextMock = vi.fn();
const validateFlashcardsWithAiMock = vi.fn();
const synthesizeRefineProposalWithAiMock = vi.fn();

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
  synthesizeRefineProposalWithAi: synthesizeRefineProposalWithAiMock,
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
      subjectName: "Biology",
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
      subjectName: "Biology",
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

  it("passes note context into multi-card generation", async () => {
    generateFlashcardsFromTextMock.mockResolvedValueOnce([
      { front: "Front", back: "Back" },
    ]);

    const { generateFlashcardsForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await generateFlashcardsForUser({
      userId: "user-1",
      subjectName: "Biology",
      noteTitle: "Photosynthesis lecture",
      text: "Chloroplasts contain chlorophyll.",
    });

    expect(result).toEqual({
      success: true,
      cards: [{ front: "Front", back: "Back" }],
    });
    expect(generateFlashcardsFromTextMock).toHaveBeenCalledWith({
      settings: {
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-or-v1-test",
      },
      subjectName: "Biology",
      noteTitle: "Photosynthesis lecture",
      text: "Chloroplasts contain chlorophyll.",
    });
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
          subjectName: "Biology",
        },
      ],
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.aiValidationPerDay",
    });
    expect(validateFlashcardsWithAiMock).not.toHaveBeenCalled();
  });

  it("returns merge limit error before provider call", async () => {
    consumeUserDailyRateLimitMock.mockResolvedValueOnce({
      limited: true,
      remaining: 0,
      resetAt: "2026-05-01T00:00:00.000Z",
      errorCode: "limits.aiMergeSynthesisPerDay",
    });

    const { synthesizeRefineProposalForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await synthesizeRefineProposalForUser({
      userId: "user-1",
      primary: {
        id: "f1",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
        subjectName: "Biology",
      },
      candidates: [
        {
          id: "f2",
          front: "<p>Other front</p>",
          back: "<p>Other back</p>",
          subjectName: "Biology",
        },
      ],
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.aiMergeSynthesisPerDay",
    });
    expect(synthesizeRefineProposalWithAiMock).not.toHaveBeenCalled();
  });

  it("returns noCandidates without touching limits", async () => {
    const { synthesizeRefineProposalForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await synthesizeRefineProposalForUser({
      userId: "user-1",
      primary: {
        id: "f1",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
        subjectName: "Biology",
      },
      candidates: [],
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.merge.noCandidates",
    });
    expect(consumeUserDailyRateLimitMock).not.toHaveBeenCalled();
  });

  it("returns declined when the AI rejects the merge", async () => {
    synthesizeRefineProposalWithAiMock.mockResolvedValueOnce(null);

    const { synthesizeRefineProposalForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await synthesizeRefineProposalForUser({
      userId: "user-1",
      primary: {
        id: "f1",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
        subjectName: "Biology",
      },
      candidates: [
        {
          id: "f2",
          front: "<p>Other front</p>",
          back: "<p>Other back</p>",
          subjectName: "Biology",
        },
      ],
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.merge.declined",
    });
  });

  it("synthesizes a refine proposal with plain-text inputs", async () => {
    synthesizeRefineProposalWithAiMock.mockResolvedValueOnce({
      action: "relate",
      front: "<p>Relation front</p>",
      back: "<p>Relation back</p>",
      sourceFlashcardIds: ["f2"],
      rationale: "The cards form a computation chain.",
    });

    const { synthesizeRefineProposalForUser } = await import(
      "@/features/flashcards/ai-service"
    );

    const result = await synthesizeRefineProposalForUser({
      userId: "user-1",
      primary: {
        id: "f1",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
        subjectName: "Biology",
      },
      candidates: [
        {
          id: "f2",
          front: "<p>Other front</p>",
          back: "<p>Other back</p>",
          subjectName: "Biology",
        },
      ],
    });

    expect(result).toEqual({
      success: true,
      synthesis: {
        action: "relate",
        front: "<p>Relation front</p>",
        back: "<p>Relation back</p>",
        sourceFlashcardIds: ["f2"],
        rationale: "The cards form a computation chain.",
      },
    });
    expect(synthesizeRefineProposalWithAiMock).toHaveBeenCalledWith({
      settings: {
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-or-v1-test",
      },
      primary: {
        id: "f1",
        front: "Front",
        back: "Back",
        subjectName: "Biology",
      },
      candidates: [
        {
          id: "f2",
          front: "Other front",
          back: "Other back",
          subjectName: "Biology",
        },
      ],
    });
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
