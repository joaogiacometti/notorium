import { beforeEach, describe, expect, it, vi } from "vitest";

const returningMock = vi.fn();
const whereMock = vi.fn(() => ({
  returning: returningMock,
}));
const setMock = vi.fn(() => ({
  where: whereMock,
}));
const updateMock = vi.fn(() => ({
  set: setMock,
}));
const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));
const transactionMock = vi.fn();
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const getReviewableFlashcardForUserMock = vi.fn();
const scheduleFlashcardReviewMock = vi.fn();
const ensureFsrsSettingsMock = vi.fn();
const maybeOptimizeFsrsParametersMock = vi.fn();

vi.mock("@/db/index", () => ({
  db: {
    transaction: transactionMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
    front: "flashcard_front_column",
    back: "flashcard_back_column",
    subjectId: "flashcard_subject_id_column",
    state: "flashcard_state_column",
    dueAt: "flashcard_due_at_column",
    stability: "flashcard_stability_column",
    difficulty: "flashcard_difficulty_column",
    ease: "flashcard_ease_column",
    intervalDays: "flashcard_interval_days_column",
    learningStep: "flashcard_learning_step_column",
    lastReviewedAt: "flashcard_last_reviewed_at_column",
    reviewCount: "flashcard_review_count_column",
    lapseCount: "flashcard_lapse_count_column",
  },
  flashcardReviewLog: {},
}));

vi.mock("@/features/flashcard-review/queries", () => ({
  getReviewableFlashcardForUser: getReviewableFlashcardForUserMock,
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  scheduleFlashcardReview: scheduleFlashcardReviewMock,
}));

vi.mock("@/features/flashcards/fsrs-settings", () => ({
  ensureFsrsSettings: ensureFsrsSettingsMock,
  maybeOptimizeFsrsParameters: maybeOptimizeFsrsParametersMock,
}));

describe("reviewFlashcardForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    ensureFsrsSettingsMock.mockResolvedValue({
      desiredRetention: 0.9,
      weights: [1, 2, 3],
    });
    maybeOptimizeFsrsParametersMock.mockResolvedValue(undefined);
  });

  it("rejects reviews for cards that are not due yet", async () => {
    getReviewableFlashcardForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      dueAt: new Date(Date.now() + 60_000),
    });

    const { reviewFlashcardForUser } = await import(
      "@/features/flashcard-review/mutations"
    );

    const result = await reviewFlashcardForUser("user-1", {
      id: "flashcard-1",
      grade: "good",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.review.notDue",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("persists the updated flashcard state and review log together", async () => {
    const now = new Date("2026-03-13T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    getReviewableFlashcardForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "subject-1",
      front: "<p>Front</p>",
      back: "<p>Back</p>",
      state: "review",
      dueAt: new Date("2026-03-13T11:00:00.000Z"),
      stability: "10.0000",
      difficulty: "5.0000",
      intervalDays: 10,
      learningStep: 0,
      lastReviewedAt: new Date("2026-03-03T12:00:00.000Z"),
      reviewCount: 10,
      lapseCount: 0,
    });
    scheduleFlashcardReviewMock.mockReturnValueOnce({
      state: "review",
      dueAt: new Date("2026-03-20T12:00:00.000Z"),
      stability: "12.0000",
      difficulty: "5.5000",
      ease: 250,
      intervalDays: 7,
      learningStep: 0,
      lastReviewedAt: now,
      reviewCount: 11,
      lapseCount: 0,
      updatedAt: now,
      daysElapsed: 10,
    });
    transactionMock.mockImplementationOnce(async (callback) =>
      callback({
        update: updateMock,
        insert: insertMock,
      }),
    );
    returningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
        subjectId: "subject-1",
        state: "review",
        dueAt: new Date("2026-03-20T12:00:00.000Z"),
        stability: "12.0000",
        difficulty: "5.5000",
        ease: 250,
        intervalDays: 7,
        learningStep: 0,
        lastReviewedAt: now,
        reviewCount: 11,
        lapseCount: 0,
      },
    ]);

    const { reviewFlashcardForUser } = await import(
      "@/features/flashcard-review/mutations"
    );

    const result = await reviewFlashcardForUser("user-1", {
      id: "flashcard-1",
      grade: "good",
    });

    expect(result).toEqual({
      success: true,
      reviewedCardId: "flashcard-1",
      flashcard: expect.objectContaining({
        id: "flashcard-1",
        reviewCount: 11,
        intervalDays: 7,
      }),
    });
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dueAt: new Date("2026-03-20T12:00:00.000Z"),
        reviewCount: 11,
        updatedAt: now,
      }),
    );
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flashcardId: "flashcard-1",
        userId: "user-1",
        rating: "good",
        reviewedAt: now,
        daysElapsed: 10,
      }),
    );
    expect(maybeOptimizeFsrsParametersMock).toHaveBeenCalledWith("user-1");
    vi.useRealTimers();
  });

  it("returns unavailable when the transaction fails", async () => {
    getReviewableFlashcardForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "subject-1",
      state: "new",
      dueAt: new Date("2026-03-13T11:00:00.000Z"),
      stability: null,
      difficulty: null,
      intervalDays: 0,
      learningStep: 0,
      lastReviewedAt: null,
      reviewCount: 0,
      lapseCount: 0,
    });
    scheduleFlashcardReviewMock.mockReturnValueOnce({
      state: "learning",
      dueAt: new Date("2026-03-13T12:01:00.000Z"),
      stability: "0.2120",
      difficulty: "6.4133",
      ease: 250,
      intervalDays: 0,
      learningStep: 0,
      lastReviewedAt: new Date("2026-03-13T12:00:00.000Z"),
      reviewCount: 1,
      lapseCount: 0,
      updatedAt: new Date("2026-03-13T12:00:00.000Z"),
      daysElapsed: 0,
    });
    transactionMock.mockRejectedValueOnce(new Error("db down"));

    const { reviewFlashcardForUser } = await import(
      "@/features/flashcard-review/mutations"
    );

    const result = await reviewFlashcardForUser("user-1", {
      id: "flashcard-1",
      grade: "again",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.review.unavailable",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});
