import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeUniqueConstraintError extends Error {
  readonly code = "23505";
}

const readOwnedFlashcardSourceMock = vi.fn();
vi.mock("@/features/flashcards/source-queries", () => ({
  readOwnedFlashcardSource: readOwnedFlashcardSourceMock,
}));

const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({
  returning: insertReturningMock,
}));
const insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));
const updateReturningMock = vi.fn();
const updateWhereMock = vi.fn(() => ({
  returning: updateReturningMock,
}));
const updateSetMock = vi.fn(() => ({
  where: updateWhereMock,
}));
const updateMock = vi.fn(() => ({
  set: updateSetMock,
}));
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({
  where: deleteWhereMock,
}));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const countFlashcardsBySubjectForUserMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();
const getFlashcardByIdForUserMock = vi.fn();
const getFlashcardRecordForUserMock = vi.fn();
const getFlashcardRecordsForUserMock = vi.fn();
const getInitialFlashcardSchedulingStateMock = vi.fn();
const improveFlashcardBackForUserMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
  inArray: inArrayMock,
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
  },
}));

vi.mock("@/features/subjects/queries", () => ({
  getSubjectRecordForUser: getSubjectRecordForUserMock,
}));

vi.mock("@/features/flashcards/ai-service", () => ({
  improveFlashcardBackForUser: improveFlashcardBackForUserMock,
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  getInitialFlashcardSchedulingState: getInitialFlashcardSchedulingStateMock,
}));

vi.mock("@/features/flashcards/queries", () => ({
  countFlashcardsBySubjectForUser: countFlashcardsBySubjectForUserMock,
  getFlashcardByIdForUser: getFlashcardByIdForUserMock,
  getFlashcardRecordForUser: getFlashcardRecordForUserMock,
  getFlashcardRecordsForUser: getFlashcardRecordsForUserMock,
}));

describe("createFlashcardForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countFlashcardsBySubjectForUserMock.mockResolvedValue(0);
    getSubjectRecordForUserMock.mockResolvedValue({
      id: "deck-1",
      name: "Metabolism",
    });
    getInitialFlashcardSchedulingStateMock.mockReturnValue({
      state: "new",
      dueAt: new Date("2026-03-18T10:00:00.000Z"),
      stability: null,
      difficulty: null,
      intervalDays: 0,
      learningStep: null,
      lastReviewedAt: null,
      reviewCount: 0,
      lapseCount: 0,
    });
  });

  it("rejects a missing or unowned note source before inserting", async () => {
    readOwnedFlashcardSourceMock.mockResolvedValueOnce(null);
    const { createFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );
    const result = await createFlashcardForUser("user-1", {
      subjectId: "deck-1",
      front: "<p>Q</p>",
      back: "<p>A</p>",
      source: { kind: "note", id: "foreign" },
    });
    expect(result).toMatchObject({
      success: false,
      errorCode: "notes.notFound",
    });
    expect(readOwnedFlashcardSourceMock).toHaveBeenCalledWith("user-1", {
      kind: "note",
      id: "foreign",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("persists an owned note source independently of the card subject", async () => {
    readOwnedFlashcardSourceMock.mockResolvedValueOnce({
      id: "doc-1",
      kind: "note",
      subjectId: "other-subject",
    });
    insertReturningMock.mockResolvedValueOnce([{ id: "card-1" }]);
    const { createFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );
    expect(
      await createFlashcardForUser("user-1", {
        subjectId: "deck-1",
        front: "<p>Q</p>",
        back: "<p>A</p>",
        source: { kind: "note", id: "doc-1" },
      }),
    ).toMatchObject({ success: true });
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceNoteId: "doc-1",
      }),
    );
  });

  it("returns duplicate error when the normalized front already exists", async () => {
    insertReturningMock.mockRejectedValueOnce(new FakeUniqueConstraintError());

    const { createFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await createFlashcardForUser("user-1", {
      subjectId: "deck-1",
      front: "<p>Same Front</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.duplicateFront",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("persists normalized front content on insert", async () => {
    insertReturningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        subjectId: "deck-1",
        front: "<p>Front</p>",
        frontNormalized: "front",
        back: "<p>Back</p>",
      },
    ]);

    const { createFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await createFlashcardForUser("user-1", {
      subjectId: "deck-1",
      front: "<p>Front</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-1",
        subjectId: "deck-1",
        front: "<p>Front</p>",
        frontNormalized: "front",
        back: "<p>Back</p>",
      },
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      subjectId: "deck-1",
      userId: "user-1",
      front: "<p>Front</p>",
      frontNormalized: "front",
      back: "<p>Back</p>",
      sourceNoteId: null,
      state: "new",
      dueAt: new Date("2026-03-18T10:00:00.000Z"),
      stability: null,
      difficulty: null,
      intervalDays: 0,
      learningStep: null,
      lastReviewedAt: null,
      reviewCount: 0,
      lapseCount: 0,
    });
  });
});

describe("editFlashcardForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubjectRecordForUserMock.mockResolvedValue({
      id: "deck-2",
      name: "Revised Deck",
    });
  });

  it("returns a duplicate error when the database rejects an updated front", async () => {
    getFlashcardByIdForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "deck-2",
      front: "<p>Original front</p>",
      back: "<p>Original back</p>",
    });
    updateReturningMock.mockRejectedValueOnce(new FakeUniqueConstraintError());
    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );
    expect(
      await editFlashcardForUser("user-1", {
        id: "flashcard-1",
        subjectId: "deck-2",
        front: "<p>Same Front</p>",
        back: "<p>Back</p>",
      }),
    ).toMatchObject({ success: false, errorCode: "flashcards.duplicateFront" });
  });

  it("updates front, back, and deck", async () => {
    getFlashcardByIdForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "deck-1",
      front: "<p>Original front</p>",
      back: "<p>Original back</p>",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(1);
    updateReturningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        subjectId: "deck-2",
        front: "<p>Updated front</p>",
        back: "<p>Updated back</p>",
      },
    ]);

    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await editFlashcardForUser("user-1", {
      id: "flashcard-1",
      subjectId: "deck-2",
      front: "<p>Updated front</p>",
      back: "<p>Updated back</p>",
    });

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-1",
        subjectId: "deck-2",
        front: "<p>Updated front</p>",
        back: "<p>Updated back</p>",
      },
      previousSubjectId: "deck-1",
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      subjectId: "deck-2",
      front: "<p>Updated front</p>",
      frontNormalized: "updated front",
      back: "<p>Updated back</p>",
    });
  });
});

describe("bulkDeleteFlashcardsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes owned flashcards and returns their ids and deck ids", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", subjectId: "deck-1" },
      { id: "flashcard-2", subjectId: "deck-2" },
    ]);

    const { bulkDeleteFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkDeleteFlashcardsForUser("user-1", {
      ids: ["flashcard-1", "flashcard-2"],
    });

    expect(result).toEqual({
      success: true,
      ids: ["flashcard-1", "flashcard-2"],
      subjectIds: ["deck-1", "deck-2"],
    });
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("loads a large deletion batch with one ownership read", async () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `card-${index}`);
    const records = ids.map((id) => ({ id, subjectId: "deck-1" }));
    getFlashcardRecordsForUserMock.mockResolvedValueOnce(records);
    const { bulkDeleteFlashcardsForUser } = await import(
      "@/features/flashcards/bulk-mutations"
    );

    const result = await bulkDeleteFlashcardsForUser("user-1", { ids });

    expect(result).toEqual({ success: true, ids, subjectIds: ["deck-1"] });
    const ownershipReadCount =
      getFlashcardByIdForUserMock.mock.calls.length +
      getFlashcardRecordsForUserMock.mock.calls.length;
    expect(ownershipReadCount).toBe(1);
    expect(getFlashcardRecordsForUserMock).toHaveBeenCalledWith("user-1", ids);
    expect(deleteWhereMock).toHaveBeenCalledWith([
      { column: "flashcard_id_column", values: ids },
      { column: "flashcard_user_id_column", value: "user-1" },
    ]);
  });

  it("does not delete any cards when a requested card is missing or unowned", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "owned", subjectId: "deck-1" },
    ]);
    const { bulkDeleteFlashcardsForUser } = await import(
      "@/features/flashcards/bulk-mutations"
    );

    const result = await bulkDeleteFlashcardsForUser("user-1", {
      ids: ["owned", "missing"],
    });

    expect(result).toEqual(
      expect.objectContaining({ errorCode: "flashcards.notFound" }),
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("bulkMoveFlashcardsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubjectRecordForUserMock.mockResolvedValue({
      id: "deck-3",
      name: "Destination Deck",
    });
  });

  it("moves flashcards to another subject", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", subjectId: "deck-1" },
      { id: "flashcard-2", subjectId: "deck-2" },
    ]);
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(10);

    const { bulkMoveFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkMoveFlashcardsForUser("user-1", {
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "deck-3",
    });

    expect(result).toEqual({
      success: true,
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "deck-3",
      previousSubjectIds: ["deck-1", "deck-2"],
    });
  });
});

describe("improveFlashcardBackForUserInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubjectRecordForUserMock.mockResolvedValue({
      id: "deck-1",
      name: "Metabolism",
    });
  });

  it("improves the back with the subject name as context", async () => {
    improveFlashcardBackForUserMock.mockResolvedValueOnce({
      success: true,
      back: "<p>Improved back</p>",
    });

    const { improveFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await improveFlashcardBackForUserInput("user-1", {
      subjectId: "deck-1",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>Energy</p>",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>Improved back</p>",
    });
    expect(improveFlashcardBackForUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      subjectName: "Metabolism",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>Energy</p>",
    });
  });

  it("returns notFound when the deck does not exist", async () => {
    getSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { improveFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await improveFlashcardBackForUserInput("user-1", {
      subjectId: "deck-1",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>Energy</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});
