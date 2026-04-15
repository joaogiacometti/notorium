import { beforeEach, describe, expect, it, vi } from "vitest";

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
const cleanupAttachmentPathnamesMock = vi.fn();
const countFlashcardsByDeckForUserMock = vi.fn();
const getDeckRecordForUserMock = vi.fn();
const getFlashcardByIdForUserMock = vi.fn();
const getFlashcardRecordForUserMock = vi.fn();
const getFlashcardRecordsForUserMock = vi.fn();
const getInitialFlashcardSchedulingStateMock = vi.fn();
const hasDuplicateFlashcardFrontForUserMock = vi.fn();
const generateFlashcardBackForUserMock = vi.fn();
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

vi.mock("@/features/attachments/cleanup", () => ({
  cleanupAttachmentPathnames: cleanupAttachmentPathnamesMock,
}));

vi.mock("@/features/decks/queries", () => ({
  getDeckRecordForUser: getDeckRecordForUserMock,
}));

vi.mock("@/features/flashcards/ai-service", () => ({
  generateFlashcardBackForUser: generateFlashcardBackForUserMock,
  improveFlashcardBackForUser: improveFlashcardBackForUserMock,
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  getInitialFlashcardSchedulingState: getInitialFlashcardSchedulingStateMock,
}));

vi.mock("@/features/flashcards/queries", () => ({
  countFlashcardsByDeckForUser: countFlashcardsByDeckForUserMock,
  getFlashcardByIdForUser: getFlashcardByIdForUserMock,
  getFlashcardRecordForUser: getFlashcardRecordForUserMock,
  getFlashcardRecordsForUser: getFlashcardRecordsForUserMock,
  hasDuplicateFlashcardFrontForUser: hasDuplicateFlashcardFrontForUserMock,
}));

describe("createFlashcardForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupAttachmentPathnamesMock.mockResolvedValue(undefined);
    countFlashcardsByDeckForUserMock.mockResolvedValue(0);
    getDeckRecordForUserMock.mockResolvedValue({
      id: "deck-1",
      name: "Metabolism",
    });
    getInitialFlashcardSchedulingStateMock.mockReturnValue({
      state: "new",
      dueAt: new Date("2026-03-18T10:00:00.000Z"),
      stability: null,
      difficulty: null,
      ease: 250,
      intervalDays: 0,
      learningStep: null,
      lastReviewedAt: null,
      reviewCount: 0,
      lapseCount: 0,
    });
    hasDuplicateFlashcardFrontForUserMock.mockResolvedValue(false);
  });

  it("returns duplicate error when the normalized front already exists", async () => {
    hasDuplicateFlashcardFrontForUserMock.mockResolvedValueOnce(true);

    const { createFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await createFlashcardForUser("user-1", {
      deckId: "deck-1",
      front: "<p>Same Front</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.duplicateFront",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("persists normalized front content on insert", async () => {
    insertReturningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        deckId: "deck-1",
        front: "<p>Front</p>",
        frontNormalized: "front",
        back: "<p>Back</p>",
      },
    ]);

    const { createFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await createFlashcardForUser("user-1", {
      deckId: "deck-1",
      front: "<p>Front</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-1",
        deckId: "deck-1",
        front: "<p>Front</p>",
        frontNormalized: "front",
        back: "<p>Back</p>",
      },
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      deckId: "deck-1",
      userId: "user-1",
      front: "<p>Front</p>",
      frontNormalized: "front",
      back: "<p>Back</p>",
      state: "new",
      dueAt: new Date("2026-03-18T10:00:00.000Z"),
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
});

describe("editFlashcardForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupAttachmentPathnamesMock.mockResolvedValue(undefined);
    getDeckRecordForUserMock.mockResolvedValue({
      id: "deck-2",
      name: "Revised Deck",
    });
    hasDuplicateFlashcardFrontForUserMock.mockResolvedValue(false);
  });

  it("updates front, back, and deck", async () => {
    getFlashcardByIdForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      deckId: "deck-1",
      front: "<p>Original front</p>",
      back: "<p>Original back</p>",
    });
    countFlashcardsByDeckForUserMock.mockResolvedValueOnce(1);
    updateReturningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        deckId: "deck-2",
        front: "<p>Updated front</p>",
        back: "<p>Updated back</p>",
      },
    ]);

    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await editFlashcardForUser("user-1", {
      id: "flashcard-1",
      deckId: "deck-2",
      front: "<p>Updated front</p>",
      back: "<p>Updated back</p>",
    });

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-1",
        deckId: "deck-2",
        front: "<p>Updated front</p>",
        back: "<p>Updated back</p>",
      },
      previousDeckId: "deck-1",
    });
    expect(updateSetMock).toHaveBeenCalledWith({
      deckId: "deck-2",
      front: "<p>Updated front</p>",
      frontNormalized: "updated front",
      back: "<p>Updated back</p>",
    });
  });
});

describe("bulkDeleteFlashcardsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupAttachmentPathnamesMock.mockResolvedValue(undefined);
  });

  it("deletes owned flashcards and returns their ids and deck ids", async () => {
    getFlashcardByIdForUserMock
      .mockResolvedValueOnce({
        id: "flashcard-1",
        deckId: "deck-1",
        front: "<p>Front 1</p>",
        back: "<p>Back 1</p>",
      })
      .mockResolvedValueOnce({
        id: "flashcard-2",
        deckId: "deck-2",
        front: "<p>Front 2</p>",
        back: "<p>Back 2</p>",
      });

    const { bulkDeleteFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkDeleteFlashcardsForUser("user-1", {
      ids: ["flashcard-1", "flashcard-2"],
    });

    expect(result).toEqual({
      success: true,
      ids: ["flashcard-1", "flashcard-2"],
      deckIds: ["deck-1", "deck-2"],
    });
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });
});

describe("bulkMoveFlashcardsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeckRecordForUserMock.mockResolvedValue({
      id: "deck-3",
      name: "Destination Deck",
    });
  });

  it("moves flashcards to another deck", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", deckId: "deck-1" },
      { id: "flashcard-2", deckId: "deck-2" },
    ]);
    countFlashcardsByDeckForUserMock.mockResolvedValueOnce(10);

    const { bulkMoveFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkMoveFlashcardsForUser("user-1", {
      ids: ["flashcard-1", "flashcard-2"],
      deckId: "deck-3",
    });

    expect(result).toEqual({
      success: true,
      ids: ["flashcard-1", "flashcard-2"],
      deckId: "deck-3",
      previousDeckIds: ["deck-1", "deck-2"],
    });
  });
});

describe("generateFlashcardBackForUserInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeckRecordForUserMock.mockResolvedValue({
      id: "deck-1",
      name: "Metabolism",
    });
  });

  it("calls generate when currentBack is absent", async () => {
    generateFlashcardBackForUserMock.mockResolvedValueOnce({
      success: true,
      back: "<p>Generated back</p>",
    });

    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await generateFlashcardBackForUserInput("user-1", {
      deckId: "deck-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>Generated back</p>",
    });
    expect(generateFlashcardBackForUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      deckName: "Metabolism",
      front: "<p>What is ATP?</p>",
    });
  });

  it("returns notFound when the deck does not exist", async () => {
    getDeckRecordForUserMock.mockResolvedValueOnce(null);

    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await generateFlashcardBackForUserInput("user-1", {
      deckId: "deck-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "decks.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});
