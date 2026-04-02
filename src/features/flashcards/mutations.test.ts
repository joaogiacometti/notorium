import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

const insertReturningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({
  returning: insertReturningMock,
}));
const insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));
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
const getActiveSubjectByIdForUserMock = vi.fn();
const hasDuplicateFlashcardFrontForUserMock = vi.fn();
const getInitialFlashcardSchedulingStateMock = vi.fn();

vi.mock("@/db/index", () => ({
  getDb: () => ({
    insert: insertMock,
    delete: deleteMock,
    update: updateMock,
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

vi.mock("@/features/flashcards/queries", () => ({
  countFlashcardsBySubjectForUser: countFlashcardsBySubjectForUserMock,
  getFlashcardRecordForUser: getFlashcardRecordForUserMock,
  getFlashcardRecordsForUser: getFlashcardRecordsForUserMock,
  hasDuplicateFlashcardFrontForUser: hasDuplicateFlashcardFrontForUserMock,
}));

vi.mock("@/features/subjects/queries", () => ({
  getActiveSubjectRecordForUser: getActiveSubjectRecordForUserMock,
  getActiveSubjectByIdForUser: getActiveSubjectByIdForUserMock,
}));

vi.mock("@/features/flashcards/ai-service", () => ({
  generateFlashcardBackForUser: vi.fn(),
  improveFlashcardBackForUser: vi.fn(),
}));

vi.mock("@/features/flashcards/fsrs", () => ({
  getInitialFlashcardSchedulingState: getInitialFlashcardSchedulingStateMock,
}));

describe("createFlashcardForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasDuplicateFlashcardFrontForUserMock.mockResolvedValue(false);
  });

  it("returns duplicate error when a flashcard with the same normalized front already exists", async () => {
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(2);
    hasDuplicateFlashcardFrontForUserMock.mockResolvedValueOnce(true);

    const { createFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await createFlashcardForUser("user-1", {
      subjectId: "subject-1",
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
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    countFlashcardsBySubjectForUserMock.mockResolvedValueOnce(2);
    hasDuplicateFlashcardFrontForUserMock.mockResolvedValueOnce(false);
    getInitialFlashcardSchedulingStateMock.mockReturnValueOnce({
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
    insertReturningMock.mockResolvedValueOnce([
      {
        id: "flashcard-1",
        subjectId: "subject-1",
        front: "<p>Front</p>",
        frontNormalized: "front",
        back: "<p>Back</p>",
      },
    ]);

    const { createFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await createFlashcardForUser("user-1", {
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
        frontNormalized: "front",
        back: "<p>Back</p>",
      },
    });
    expect(insertValuesMock).toHaveBeenCalledWith({
      subjectId: "subject-1",
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
    hasDuplicateFlashcardFrontForUserMock.mockResolvedValue(false);
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
      frontNormalized: "updated front",
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

  it("returns duplicate error when editing to a normalized front used by another card", async () => {
    getFlashcardRecordForUserMock.mockResolvedValueOnce({
      id: "flashcard-1",
      subjectId: "subject-1",
    });
    getActiveSubjectRecordForUserMock.mockResolvedValueOnce({
      id: "subject-1",
    });
    hasDuplicateFlashcardFrontForUserMock.mockResolvedValueOnce(true);

    const { editFlashcardForUser } = await import(
      "@/features/flashcards/mutations"
    );

    const result = await editFlashcardForUser("user-1", {
      id: "flashcard-1",
      subjectId: "subject-1",
      front: "<p>Duplicate</p>",
      back: "<p>Back</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.duplicateFront",
      errorParams: undefined,
      errorMessage: undefined,
    });
    expect(updateMock).not.toHaveBeenCalled();
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
    expect(setMock).toHaveBeenCalledWith({
      subjectId: "subject-1",
      front: "<p>Front</p>",
      frontNormalized: "front",
      back: "<p>Back</p>",
    });
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

describe("generateFlashcardBackForUserInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls generate when currentBack is absent", async () => {
    const { generateFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );
    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    vi.mocked(generateFlashcardBackForUser).mockResolvedValueOnce({
      success: true,
      back: "<p>Generated back</p>",
    });
    getActiveSubjectByIdForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      name: "Biology",
    });

    const result = await generateFlashcardBackForUserInput("user-1", {
      subjectId: "subject-1",
      front: "<p>What is ATP?</p>",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>Generated back</p>",
    });
    expect(generateFlashcardBackForUser).toHaveBeenCalledWith({
      userId: "user-1",
      subjectName: "Biology",
      front: "<p>What is ATP?</p>",
    });
  });

  it("calls improve when currentBack is present", async () => {
    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );
    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    vi.mocked(improveFlashcardBackForUser).mockResolvedValueOnce({
      success: true,
      back: "<p>Improved back</p>",
    });
    getActiveSubjectByIdForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      name: "Biology",
    });

    const result = await generateFlashcardBackForUserInput("user-1", {
      subjectId: "subject-1",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>ATP stores energy.</p>",
    });

    expect(result).toEqual({
      success: true,
      back: "<p>Improved back</p>",
    });
    expect(improveFlashcardBackForUser).toHaveBeenCalledWith({
      userId: "user-1",
      subjectName: "Biology",
      front: "<p>What is ATP?</p>",
      currentBack: "<p>ATP stores energy.</p>",
    });
  });

  it("returns notFound when subject does not exist", async () => {
    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    getActiveSubjectByIdForUserMock.mockResolvedValueOnce(null);

    const result = await generateFlashcardBackForUserInput("user-1", {
      subjectId: "nonexistent",
      front: "<p>Front</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "subjects.notFound",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });

  it("returns ai error when improve service fails", async () => {
    const { improveFlashcardBackForUser } = await import(
      "@/features/flashcards/ai-service"
    );
    const { generateFlashcardBackForUserInput } = await import(
      "@/features/flashcards/mutations"
    );

    vi.mocked(improveFlashcardBackForUser).mockResolvedValueOnce({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
    });
    getActiveSubjectByIdForUserMock.mockResolvedValueOnce({
      id: "subject-1",
      name: "Biology",
    });

    const result = await generateFlashcardBackForUserInput("user-1", {
      subjectId: "subject-1",
      front: "<p>Front</p>",
      currentBack: "<p>Existing back</p>",
    });

    expect(result).toEqual({
      success: false,
      errorCode: "flashcards.ai.notConfigured",
      errorParams: undefined,
      errorMessage: undefined,
    });
  });
});
