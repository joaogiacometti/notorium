import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureFsrsSettingsMock,
  getAllFlashcardsForExamMock,
  getFlashcardReviewStateForUserMock,
} = vi.hoisted(() => ({
  ensureFsrsSettingsMock: vi.fn(),
  getAllFlashcardsForExamMock: vi.fn(),
  getFlashcardReviewStateForUserMock: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  getAuthenticatedUserId: async () => "user-1",
}));

vi.mock("@/features/flashcard-review/mutations", () => ({
  reviewFlashcardForUser: vi.fn(),
  undoFlashcardReviewForUser: vi.fn(),
}));

vi.mock("@/features/flashcard-review/queries", () => ({
  getAllFlashcardsForExam: getAllFlashcardsForExamMock,
  getFlashcardReviewStateForUser: getFlashcardReviewStateForUserMock,
}));

vi.mock("@/features/flashcards/fsrs/settings", () => ({
  ensureFsrsSettings: ensureFsrsSettingsMock,
}));

describe("flashcard review read actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getFlashcardReviewState rejects an out-of-range limit before querying", async () => {
    const { getFlashcardReviewState } = await import(
      "@/app/actions/flashcard-review"
    );

    await expect(
      getFlashcardReviewState({ limit: 1_000_000 }),
    ).rejects.toThrow();
    expect(getFlashcardReviewStateForUserMock).not.toHaveBeenCalled();
  });

  it("getFlashcardReviewState returns the scoped review state", async () => {
    const reviewState = { cards: [], summary: { dueCount: 0, totalCount: 0 } };
    getFlashcardReviewStateForUserMock.mockResolvedValueOnce(reviewState);
    const { getFlashcardReviewState } = await import(
      "@/app/actions/flashcard-review"
    );

    const result = await getFlashcardReviewState({
      subjectId: "subject-1",
      limit: 50,
    });

    expect(result).toBe(reviewState);
    expect(getFlashcardReviewStateForUserMock).toHaveBeenCalledWith("user-1", {
      subjectId: "subject-1",
      limit: 50,
    });
  });

  it("getExamFlashcards rejects a malformed subject id before querying", async () => {
    const { getExamFlashcards } = await import(
      "@/app/actions/flashcard-review"
    );

    await expect(getExamFlashcards({ subjectId: "" })).rejects.toThrow();
    expect(ensureFsrsSettingsMock).not.toHaveBeenCalled();
    expect(getAllFlashcardsForExamMock).not.toHaveBeenCalled();
  });

  it("getExamFlashcards returns exam cards", async () => {
    getAllFlashcardsForExamMock.mockResolvedValueOnce([{ id: "card-1" }]);
    const { getExamFlashcards } = await import(
      "@/app/actions/flashcard-review"
    );

    const result = await getExamFlashcards({ subjectId: "subject-1" });

    expect(result).toEqual([{ id: "card-1" }]);
    expect(ensureFsrsSettingsMock).toHaveBeenCalledWith("user-1");
    expect(getAllFlashcardsForExamMock).toHaveBeenCalledWith("user-1", {
      subjectId: "subject-1",
    });
  });
});
