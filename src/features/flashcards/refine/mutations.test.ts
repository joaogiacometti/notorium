import { beforeEach, describe, expect, it, vi } from "vitest";

const selectWhereMock = vi.fn();
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
const selectMock = vi.fn(() => ({ from: selectFromMock }));

const txInsertReturningMock = vi.fn();
const txInsertValuesMock = vi.fn(() => ({
  returning: txInsertReturningMock,
}));
const txInsertMock = vi.fn(() => ({ values: txInsertValuesMock }));
const txDeleteWhereMock = vi.fn();
const txDeleteMock = vi.fn(() => ({ where: txDeleteWhereMock }));
const transactionMock = vi.fn(async (run: (tx: unknown) => Promise<unknown>) =>
  run({ insert: txInsertMock, delete: txDeleteMock }),
);

const dbInsertReturningMock = vi.fn();
const dbInsertValuesMock = vi.fn(() => ({ returning: dbInsertReturningMock }));
const dbInsertMock = vi.fn(() => ({ values: dbInsertValuesMock }));

const cleanupAttachmentsAfterMutationMock = vi.fn();
const getInitialFlashcardSchedulingStateMock = vi.fn();
const isUniqueViolationErrorMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
    insert: dbInsertMock,
    transaction: transactionMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => conditions),
  eq: vi.fn((column, value) => ({ column, value })),
  inArray: vi.fn((column, values) => ({ column, values })),
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
  },
  flashcardMergeLog: { id: "flashcard_merge_log_id_column" },
}));

vi.mock("@/features/attachments", () => ({
  cleanupAttachmentsAfterMutation: cleanupAttachmentsAfterMutationMock,
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  getInitialFlashcardSchedulingState: getInitialFlashcardSchedulingStateMock,
}));

vi.mock("@/lib/db/errors", () => ({
  isUniqueViolationError: isUniqueViolationErrorMock,
}));

const primaryCard = {
  id: "flashcard-1",
  deckId: "deck-1",
  front: "<p>Primary front</p>",
  back: "<p>Primary back</p>",
};

const sourceCard = {
  id: "flashcard-2",
  deckId: "deck-1",
  front: "<p>Source front</p>",
  back: "<p>Source back</p>",
};

const mergeForm = {
  action: "merge" as const,
  primaryFlashcardId: "flashcard-1",
  front: "<p>Merged front</p>",
  back: "<p>Merged back</p>",
  sourceFlashcardIds: ["flashcard-2"],
};

const relateForm = {
  ...mergeForm,
  action: "relate" as const,
  front: "<p>Relation front</p>",
  back: "<p>Relation back</p>",
};

describe("applyFlashcardMergeForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupAttachmentsAfterMutationMock.mockResolvedValue(undefined);
    isUniqueViolationErrorMock.mockReturnValue(false);
    getInitialFlashcardSchedulingStateMock.mockReturnValue({
      state: "new",
      dueAt: new Date("2026-06-10T10:00:00.000Z"),
      stability: null,
      difficulty: null,
      ease: 250,
      intervalDays: 0,
      learningStep: null,
      lastReviewedAt: null,
      reviewCount: 0,
      lapseCount: 0,
    });
  });

  it("returns notFound when a merged card is missing or foreign", async () => {
    selectWhereMock.mockResolvedValueOnce([primaryCard]);

    const { applyFlashcardMergeForUser } = await import(
      "@/features/flashcards/refine/mutations"
    );

    const result = await applyFlashcardMergeForUser("user-1", mergeForm);

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("creates the merged card, logs lineage, and deletes sources", async () => {
    selectWhereMock.mockResolvedValueOnce([primaryCard, sourceCard]);
    txInsertReturningMock.mockResolvedValueOnce([
      { id: "flashcard-3", deckId: "deck-1", front: "<p>Merged front</p>" },
    ]);

    const { applyFlashcardMergeForUser } = await import(
      "@/features/flashcards/refine/mutations"
    );

    const result = await applyFlashcardMergeForUser("user-1", mergeForm);

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-3",
        deckId: "deck-1",
        front: "<p>Merged front</p>",
      },
      deletedIds: ["flashcard-1", "flashcard-2"],
    });
    expect(txDeleteMock).toHaveBeenCalledTimes(1);
    expect(txInsertValuesMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        deckId: "deck-1",
        userId: "user-1",
        front: "<p>Merged front</p>",
        frontNormalized: "merged front",
        back: "<p>Merged back</p>",
        state: "new",
      }),
    );
    expect(txInsertValuesMock).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({
        userId: "user-1",
        mergedFlashcardId: "flashcard-3",
        sourceFlashcardId: "flashcard-1",
        sourceFront: "<p>Primary front</p>",
        sourceBack: "<p>Primary back</p>",
      }),
      expect.objectContaining({
        sourceFlashcardId: "flashcard-2",
        sourceFront: "<p>Source front</p>",
        sourceBack: "<p>Source back</p>",
      }),
    ]);
    expect(cleanupAttachmentsAfterMutationMock).toHaveBeenCalledWith(
      "user-1",
      [
        "<p>Primary front</p>",
        "<p>Primary back</p>",
        "<p>Source front</p>",
        "<p>Source back</p>",
      ],
      ["<p>Merged front</p>", "<p>Merged back</p>"],
    );
  });

  it("maps unique violations to a duplicate-front error", async () => {
    selectWhereMock.mockResolvedValueOnce([primaryCard, sourceCard]);
    transactionMock.mockRejectedValueOnce(new Error("unique violation"));
    isUniqueViolationErrorMock.mockReturnValueOnce(true);

    const { applyFlashcardMergeForUser } = await import(
      "@/features/flashcards/refine/mutations"
    );

    const result = await applyFlashcardMergeForUser("user-1", mergeForm);

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.duplicateFront",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(cleanupAttachmentsAfterMutationMock).not.toHaveBeenCalled();
  });
});

describe("applyRefineProposalForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isUniqueViolationErrorMock.mockReturnValue(false);
    getInitialFlashcardSchedulingStateMock.mockReturnValue({
      state: "new",
      reviewCount: 0,
      lapseCount: 0,
    });
  });

  it("creates a relationship card without deleting the sources", async () => {
    selectWhereMock.mockResolvedValueOnce([primaryCard, sourceCard]);
    dbInsertReturningMock.mockResolvedValueOnce([
      { id: "flashcard-3", deckId: "deck-1", front: "<p>Relation front</p>" },
    ]);

    const { applyRefineProposalForUser } = await import(
      "@/features/flashcards/refine/mutations"
    );

    const result = await applyRefineProposalForUser("user-1", relateForm);

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-3",
        deckId: "deck-1",
        front: "<p>Relation front</p>",
      },
      deletedIds: [],
    });
    expect(dbInsertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deckId: "deck-1",
        userId: "user-1",
        front: "<p>Relation front</p>",
        frontNormalized: "relation front",
        back: "<p>Relation back</p>",
        state: "new",
      }),
    );
    expect(transactionMock).not.toHaveBeenCalled();
    expect(txDeleteMock).not.toHaveBeenCalled();
  });

  it("returns notFound when a relate source card is missing", async () => {
    selectWhereMock.mockResolvedValueOnce([primaryCard]);

    const { applyRefineProposalForUser } = await import(
      "@/features/flashcards/refine/mutations"
    );

    const result = await applyRefineProposalForUser("user-1", relateForm);

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("maps relate unique violations to a duplicate-front error", async () => {
    selectWhereMock.mockResolvedValueOnce([primaryCard, sourceCard]);
    dbInsertReturningMock.mockRejectedValueOnce(new Error("unique violation"));
    isUniqueViolationErrorMock.mockReturnValueOnce(true);

    const { applyRefineProposalForUser } = await import(
      "@/features/flashcards/refine/mutations"
    );

    const result = await applyRefineProposalForUser("user-1", relateForm);

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.duplicateFront",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("delegates merge proposals to the merge mutation", async () => {
    selectWhereMock.mockResolvedValueOnce([primaryCard, sourceCard]);
    cleanupAttachmentsAfterMutationMock.mockResolvedValue(undefined);
    txInsertReturningMock.mockResolvedValueOnce([
      { id: "flashcard-3", deckId: "deck-1" },
    ]);

    const { applyRefineProposalForUser } = await import(
      "@/features/flashcards/refine/mutations"
    );

    const result = await applyRefineProposalForUser("user-1", mergeForm);

    expect(result).toMatchObject({
      success: true,
      deletedIds: ["flashcard-1", "flashcard-2"],
    });
    expect(txDeleteMock).toHaveBeenCalledTimes(1);
  });
});
