import { beforeEach, describe, expect, it, vi } from "vitest";

const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn((_values?: unknown) => ({
  returning: insertReturningMock,
}));
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const cleanupAttachmentsAfterMutationMock = vi.fn();
const getSubjectRecordForUserMock = vi.fn();
const countFlashcardsBySubjectForUserMock = vi.fn();
const getClozeSiblingsForUserMock = vi.fn();
const getInitialFlashcardSchedulingStateMock = vi.fn();

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
    clozeNoteId: "flashcard_cloze_note_id_column",
    clozeOrdinal: "flashcard_cloze_ordinal_column",
  },
}));

vi.mock("@/features/attachments", () => ({
  cleanupAttachmentsAfterMutation: cleanupAttachmentsAfterMutationMock,
}));

vi.mock("@/features/subjects/queries", () => ({
  getSubjectRecordForUser: getSubjectRecordForUserMock,
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  getInitialFlashcardSchedulingState: getInitialFlashcardSchedulingStateMock,
}));

vi.mock("@/features/flashcards/queries", () => ({
  countFlashcardsBySubjectForUser: countFlashcardsBySubjectForUserMock,
  getClozeSiblingsForUser: getClozeSiblingsForUserMock,
}));

const scheduling = {
  state: "new" as const,
  dueAt: new Date("2026-06-12T10:00:00.000Z"),
  stability: null,
  difficulty: null,
  ease: 250,
  intervalDays: 0,
  learningStep: null,
  lastReviewedAt: null,
  reviewCount: 0,
  lapseCount: 0,
};

describe("createClozeNoteForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupAttachmentsAfterMutationMock.mockResolvedValue(undefined);
    getSubjectRecordForUserMock.mockResolvedValue({
      id: "deck-1",
      name: "Bio",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValue(0);
    getInitialFlashcardSchedulingStateMock.mockReturnValue(scheduling);
  });

  it("fans out one sibling per distinct ordinal and returns the first", async () => {
    insertReturningMock.mockResolvedValueOnce([
      { id: "sib-1" },
      { id: "sib-2" },
    ]);

    const { createClozeNoteForUser } = await import(
      "@/features/flashcards/cloze-mutations"
    );

    const result = await createClozeNoteForUser("user-1", {
      subjectId: "deck-1",
      clozeSource: "<p>{{c1::a}} and {{c2::b}}</p>",
      back: "",
    });

    expect(result).toEqual({ success: true, flashcard: { id: "sib-1" } });

    const values = insertValuesMock.mock.calls[0]?.[0] as Array<{
      clozeOrdinal: number;
      clozeNoteId: string;
      type: string;
      front: string;
    }>;
    expect(values).toHaveLength(2);
    expect(values.map((card) => card.clozeOrdinal)).toEqual([1, 2]);
    expect(new Set(values.map((card) => card.clozeNoteId)).size).toBe(1);
    expect(values[0].type).toBe("cloze");
    // c1's front blanks the first answer and reveals the sibling.
    expect(values[0].front).toContain("<mark>[...]</mark>");
    expect(values[0].front).toContain("b");
  });

  it("rejects when the deck is missing", async () => {
    getSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { createClozeNoteForUser } = await import(
      "@/features/flashcards/cloze-mutations"
    );

    const result = await createClozeNoteForUser("user-1", {
      subjectId: "missing",
      clozeSource: "<p>{{c1::a}}</p>",
      back: "",
    });

    expect(result.success).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects when the deck would exceed its card limit", async () => {
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(2000);

    const { createClozeNoteForUser } = await import(
      "@/features/flashcards/cloze-mutations"
    );

    const result = await createClozeNoteForUser("user-1", {
      subjectId: "deck-1",
      clozeSource: "<p>{{c1::a}}</p>",
      back: "",
    });

    expect(result.success).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("editClozeNoteForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupAttachmentsAfterMutationMock.mockResolvedValue(undefined);
    getSubjectRecordForUserMock.mockResolvedValue({
      id: "deck-1",
      name: "Bio",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValue(1);
    getInitialFlashcardSchedulingStateMock.mockReturnValue(scheduling);
  });

  it("updates kept ordinals in place and inserts new ones", async () => {
    const existing = {
      id: "sib-1",
      type: "cloze" as const,
      clozeNoteId: "note-1",
      clozeOrdinal: 1,
      subjectId: "deck-1",
      front: "<p>old</p>",
      back: "<p>old</p>",
    };
    // First call: siblings before sync (only c1). Second call: after sync.
    getClozeSiblingsForUserMock
      .mockResolvedValueOnce([existing])
      .mockResolvedValueOnce([
        existing,
        { id: "sib-2", clozeOrdinal: 2, front: "f2", back: "b2" },
      ]);

    const { editClozeNoteForUser } = await import(
      "@/features/flashcards/cloze-mutations"
    );

    const result = await editClozeNoteForUser(
      "user-1",
      {
        id: "sib-1",
        subjectId: "deck-1",
        clozeSource: "<p>{{c1::a}} and {{c2::b}}</p>",
        back: "",
      },
      existing as never,
    );

    expect(result.success).toBe(true);
    // c1 updated in place, c2 inserted as a new sibling.
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    if (result.success) {
      expect(result.previousSubjectId).toBe("deck-1");
    }
  });
});

describe("deleteClozeNoteForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes every sibling and returns the deleted cards", async () => {
    const siblings = [
      { id: "sib-1", front: "<p>f1</p>", back: "<p>b1</p>" },
      { id: "sib-2", front: "<p>f2</p>", back: "<p>b2</p>" },
    ];
    getClozeSiblingsForUserMock.mockResolvedValueOnce(siblings);

    const { deleteClozeNoteForUser } = await import(
      "@/features/flashcards/cloze-mutations"
    );

    const removed = await deleteClozeNoteForUser("user-1", "note-1");

    expect(removed).toEqual(siblings);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the note has no siblings", async () => {
    getClozeSiblingsForUserMock.mockResolvedValueOnce([]);

    const { deleteClozeNoteForUser } = await import(
      "@/features/flashcards/cloze-mutations"
    );

    const removed = await deleteClozeNoteForUser("user-1", "note-empty");

    expect(removed).toEqual([]);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
