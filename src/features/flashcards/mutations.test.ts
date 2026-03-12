import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

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
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({
  where: deleteWhereMock,
}));
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const getFlashcardRecordForUserMock = vi.fn();
const getFlashcardRecordsForUserMock = vi.fn();
const countFlashcardsBySubjectForUserMock = vi.fn();
const getActiveSubjectRecordForUserMock = vi.fn();

vi.mock("@/db/index", () => ({
  db: {
    delete: deleteMock,
    update: updateMock,
  },
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

vi.mock("@/features/flashcards/queries", () => ({
  countFlashcardsBySubjectForUser: countFlashcardsBySubjectForUserMock,
  getFlashcardRecordForUser: getFlashcardRecordForUserMock,
  getFlashcardRecordsForUser: getFlashcardRecordsForUserMock,
}));

vi.mock("@/features/subjects/queries", () => ({
  getActiveSubjectRecordForUser: getActiveSubjectRecordForUserMock,
}));

vi.mock("@/features/flashcards/ai-service", () => ({
  generateFlashcardBackForUser: vi.fn(),
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  getInitialFlashcardSchedulingState: vi.fn(),
}));

describe("editFlashcardForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates front and back without changing the subject", async () => {
    getFlashcardRecordForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "subject-1",
    });
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    returningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        subjectId: "subject-1",
        front: "<p>Updated front</p>",
        back: "<p>Updated back</p>",
      },
    ]);

    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await editFlashcardForUser("user-1", {
      id: "flashcard-1",
      subjectId: "subject-1",
      front: "<p>Updated front</p>",
      back: "<p>Updated back</p>",
    });

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-1",
        subjectId: "subject-1",
        front: "<p>Updated front</p>",
        back: "<p>Updated back</p>",
      },
      previousSubjectId: "subject-1",
    });
    expect(countFlashcardsBySubjectForUserMock).not.toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith({
      subjectId: "subject-1",
      front: "<p>Updated front</p>",
      back: "<p>Updated back</p>",
    });
  });

  it("moves the flashcard to another active subject owned by the user", async () => {
    getFlashcardRecordForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "subject-1",
    });
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-2",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(12);
    returningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        subjectId: "subject-2",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
      },
    ]);

    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await editFlashcardForUser("user-1", {
      id: "flashcard-1",
      subjectId: "subject-2",
      front: "<p>Front</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-1",
        subjectId: "subject-2",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
      },
      previousSubjectId: "subject-1",
    });
    expect(countFlashcardsBySubjectForUserMock).toHaveBeenCalledWith(
      "user-1",
      "subject-2",
    );
  });

  it("rejects moves to nonexistent or archived subjects", async () => {
    getFlashcardRecordForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "subject-1",
    });
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await editFlashcardForUser("user-1", {
      id: "flashcard-1",
      subjectId: "subject-2",
      front: "<p>Front</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects moves when the destination subject is already at the flashcard limit", async () => {
    getFlashcardRecordForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "subject-1",
    });
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-2",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(
      LIMITS.maxFlashcardsPerSubject,
    );

    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await editFlashcardForUser("user-1", {
      id: "flashcard-1",
      subjectId: "subject-2",
      front: "<p>Front</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.flashcardLimit",
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("allows editing within the same subject even when that subject is already at the flashcard limit", async () => {
    getFlashcardRecordForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "subject-1",
    });
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    returningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        subjectId: "subject-1",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
      },
    ]);

    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await editFlashcardForUser("user-1", {
      id: "flashcard-1",
      subjectId: "subject-1",
      front: "<p>Front</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: true,
      flashcard: {
        id: "flashcard-1",
        subjectId: "subject-1",
        front: "<p>Front</p>",
        back: "<p>Back</p>",
      },
      previousSubjectId: "subject-1",
    });
    expect(countFlashcardsBySubjectForUserMock).not.toHaveBeenCalled();
  });
});

describe("bulkDeleteFlashcardsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes all owned flashcards and returns their ids and subject ids", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", subjectId: "subject-1" },
      { id: "flashcard-2", subjectId: "subject-2" },
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
      subjectIds: ["subject-1", "subject-2"],
    });
    expect(deleteMock).toHaveBeenCalled();
    expect(inArrayMock).toHaveBeenCalledWith("flashcard_id_column", [
      "flashcard-1",
      "flashcard-2",
    ]);
  });

  it("fails atomically when any selected flashcard is missing", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", subjectId: "subject-1" },
    ]);

    const { bulkDeleteFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkDeleteFlashcardsForUser("user-1", {
      ids: ["flashcard-1", "flashcard-2"],
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("bulkMoveFlashcardsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves owned flashcards across subjects", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", subjectId: "subject-1" },
      { id: "flashcard-2", subjectId: "subject-2" },
    ]);
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-3",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(5);

    const { bulkMoveFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkMoveFlashcardsForUser("user-1", {
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "subject-3",
    });

    expect(result).toEqual({
      success: true,
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "subject-3",
      previousSubjectIds: ["subject-1", "subject-2"],
    });
    expect(updateMock).toHaveBeenCalled();
  });

  it("fails atomically when destination subject is missing", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", subjectId: "subject-1" },
    ]);
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce(null);

    const { bulkMoveFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkMoveFlashcardsForUser("user-1", {
      ids: ["flashcard-1"],
      subjectId: "subject-3",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("fails atomically when the destination subject would exceed the limit", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", subjectId: "subject-1" },
      { id: "flashcard-2", subjectId: "subject-2" },
    ]);
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-3",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(
      LIMITS.maxFlashcardsPerSubject - 1,
    );

    const { bulkMoveFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkMoveFlashcardsForUser("user-1", {
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "subject-3",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "limits.flashcardLimit",
      errorParams: { max: LIMITS.maxFlashcardsPerSubject },
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("counts only cards not already in the destination subject against the limit", async () => {
    getFlashcardRecordsForUserMock.mockResolvedValueOnce([
      { id: "flashcard-1", subjectId: "subject-3" },
      { id: "flashcard-2", subjectId: "subject-1" },
    ]);
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-3",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(
      LIMITS.maxFlashcardsPerSubject - 1,
    );

    const { bulkMoveFlashcardsForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await bulkMoveFlashcardsForUser("user-1", {
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "subject-3",
    });

    expect(result).toEqual({
      success: true,
      ids: ["flashcard-1", "flashcard-2"],
      subjectId: "subject-3",
      previousSubjectIds: ["subject-3", "subject-1"],
    });
    expect(countFlashcardsBySubjectForUserMock).toHaveBeenCalledWith(
      "user-1",
      "subject-3",
    );
  });
});
