import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));
const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const transactionMock = vi.fn(async (run: (tx: unknown) => Promise<unknown>) =>
  run({ delete: deleteMock, insert: insertMock }),
);
const getFlashcardByIdForUserMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();
const countFlashcardsBySubjectForUserMock = vi.fn();
const cleanupAttachmentsAfterMutationMock = vi.fn();
const getInitialFlashcardSchedulingStateMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({ transaction: transactionMock }),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => conditions),
  eq: vi.fn((column, value) => ({ column, value })),
}));

vi.mock("@/db/schema", () => ({
  flashcard: { id: "flashcard_id", userId: "flashcard_user_id" },
}));

vi.mock("@/features/attachments", () => ({
  cleanupAttachmentsAfterMutation: cleanupAttachmentsAfterMutationMock,
}));

vi.mock("@/features/flashcards/queries", () => ({
  countFlashcardsBySubjectForUser: countFlashcardsBySubjectForUserMock,
  getFlashcardByIdForUser: getFlashcardByIdForUserMock,
}));

vi.mock("@/features/subjects/queries", () => ({
  getSubjectRecordForUser: getSubjectRecordForUserMock,
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  getInitialFlashcardSchedulingState: getInitialFlashcardSchedulingStateMock,
}));

describe("splitFlashcardForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFlashcardByIdForUserMock.mockResolvedValue({
      id: "original",
      type: "basic",
      subjectId: "subject-1",
      front: "<p>Original</p>",
      back: "<p>Answer</p>",
    });
    getSubjectRecordForUserMock.mockResolvedValue({ id: "subject-1" });
    countFlashcardsBySubjectForUserMock.mockResolvedValue(10);
    getInitialFlashcardSchedulingStateMock.mockReturnValue({ state: "new" });
    cleanupAttachmentsAfterMutationMock.mockResolvedValue(undefined);
  });

  it("replaces the original with every split card in one transaction", async () => {
    const { splitFlashcardForUser } = await import(
      "@/features/flashcards/split-mutation"
    );
    const cards = [
      { front: "<p>One</p>", back: "<p>A</p>" },
      { front: "<p>Two</p>", back: "<p>B</p>" },
    ];

    const result = await splitFlashcardForUser("user-1", {
      id: "original",
      subjectId: "subject-1",
      cards,
    });

    expect(result).toEqual({
      success: true,
      createdCount: 2,
      deletedIds: ["original"],
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith([
      expect.objectContaining({ frontNormalized: "one" }),
      expect.objectContaining({ frontNormalized: "two" }),
    ]);
  });
});
