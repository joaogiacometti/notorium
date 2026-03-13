import { beforeEach, describe, expect, it, vi } from "vitest";

const whereMock = vi.fn();
const fromMock = vi.fn(() => ({
  where: whereMock,
}));
const selectMock = vi.fn(() => ({
  from: fromMock,
}));
const returningMock = vi.fn();
const insertValuesMock = vi.fn(() => ({
  returning: returningMock,
  onConflictDoUpdate: vi.fn(),
}));
const _insertMock = vi.fn(() => ({
  values: insertValuesMock,
}));
const transactionMock = vi.fn();
const countMock = vi.fn(() => "count_column");
const eqMock = vi.fn((column, value) => ({ column, value }));
const getImportedFlashcardSchedulingStateMock = vi.fn();
const preValidateImportStructureMock = vi.fn();
const validateSubjectImportLimitsMock = vi.fn();
const parseActionInputMock = vi.fn();

vi.mock("@/db/index", () => ({
  db: {
    select: selectMock,
    transaction: transactionMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  count: countMock,
  eq: eqMock,
}));

vi.mock("@/db/schema", () => ({
  assessment: {},
  attendanceMiss: {},
  flashcard: {},
  flashcardSchedulerSettings: {
    userId: "flashcard_scheduler_user_id_column",
  },
  note: {},
  subject: {
    userId: "subject_user_id_column",
    id: "subject_id_column",
  },
}));

vi.mock("@/features/data-transfer/flashcard-scheduling", () => ({
  getImportedFlashcardSchedulingState: getImportedFlashcardSchedulingStateMock,
}));

vi.mock("@/features/data-transfer/import-prevalidation", () => ({
  getImportPayloadBytes: vi.fn(() => 0),
  preValidateImportStructure: preValidateImportStructureMock,
  validateSubjectImportLimits: validateSubjectImportLimitsMock,
}));

vi.mock("@/lib/server/action-input", () => ({
  parseActionInput: parseActionInputMock,
}));

describe("importDataForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    preValidateImportStructureMock.mockReturnValue(undefined);
    validateSubjectImportLimitsMock.mockReturnValue(undefined);
  });

  it("persists imported scheduler settings and flashcard scheduling state", async () => {
    const input = {
      version: 1,
      exportedAt: "2026-03-13T00:00:00.000Z",
      flashcardScheduler: {
        desiredRetention: 0.87,
        weights: [1, 2, 3],
      },
      subjects: [
        {
          name: "Math",
          description: null,
          totalClasses: null,
          maxMisses: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          notes: [],
          attendanceMisses: [],
          assessments: [],
          flashcards: [
            {
              front: "<p>Front</p>",
              back: "<p>Back</p>",
              state: "review",
              dueAt: "2026-03-20T00:00:00.000Z",
              stability: 10,
              difficulty: 5,
              ease: 250,
              intervalDays: 7,
              learningStep: 0,
              lastReviewedAt: "2026-03-13T00:00:00.000Z",
              reviewCount: 3,
              lapseCount: 1,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        },
      ],
    };
    parseActionInputMock.mockReturnValueOnce({
      success: true,
      data: input,
    });
    whereMock.mockResolvedValueOnce([{ total: 0 }]);
    getImportedFlashcardSchedulingStateMock.mockReturnValueOnce({
      state: "review",
      dueAt: new Date("2026-03-20T00:00:00.000Z"),
      stability: "10.0000",
      difficulty: "5.0000",
      ease: 250,
      intervalDays: 7,
      learningStep: 0,
      lastReviewedAt: new Date("2026-03-13T00:00:00.000Z"),
      reviewCount: 3,
      lapseCount: 1,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const txInsertMock = vi.fn(() => ({
      values: insertValuesMock,
    }));
    transactionMock.mockImplementationOnce(async (callback) =>
      callback({
        insert: txInsertMock,
      }),
    );
    returningMock.mockResolvedValueOnce([{ id: "subject-1" }]);

    const { importDataForUser } = await import(
      "@/features/data-transfer/import"
    );

    const result = await importDataForUser("user-1", input);

    expect(result).toEqual({ success: true, imported: 1 });
    expect(getImportedFlashcardSchedulingStateMock).toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          front: "<p>Front</p>",
          reviewCount: 3,
          subjectId: "subject-1",
        }),
      ]),
    );
  });
});
