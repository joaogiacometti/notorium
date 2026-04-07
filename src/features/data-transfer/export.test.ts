import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const andMock = vi.fn((...conditions) => conditions);
const eqMock = vi.fn((column, value) => ({ column, value }));
const inArrayMock = vi.fn((column, values) => ({ column, values }));
const isNullMock = vi.fn((column) => ({ column }));

vi.mock("@/db/index", () => ({
  getDb: () => ({
    select: selectMock,
  }),
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
  inArray: inArrayMock,
  isNull: isNullMock,
}));

vi.mock("@/db/schema", () => ({
  assessment: {
    userId: "assessment_user_id_column",
    subjectId: "assessment_subject_id_column",
  },
  attendanceMiss: {
    userId: "attendance_user_id_column",
    subjectId: "attendance_subject_id_column",
  },
  deck: {
    userId: "deck_user_id_column",
    subjectId: "deck_subject_id_column",
    id: "deck_id_column",
  },
  flashcard: {
    userId: "flashcard_user_id_column",
    subjectId: "flashcard_subject_id_column",
  },
  flashcardSchedulerSettings: { userId: "flashcard_scheduler_user_id_column" },
  note: { userId: "note_user_id_column", subjectId: "note_subject_id_column" },
  subject: {
    userId: "subject_user_id_column",
    archivedAt: "subject_archived_at_column",
  },
}));

function mockSelectLimitOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      where: () => ({
        limit: vi.fn().mockResolvedValue(value),
      }),
    }),
  }));
}

function mockSelectWhereOnce(value: unknown) {
  selectMock.mockImplementationOnce(() => ({
    from: () => ({
      where: vi.fn().mockResolvedValue(value),
    }),
  }));
}

describe("exportDataForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("falls back to default scheduler settings when persisted values are malformed", async () => {
    mockSelectLimitOnce([
      {
        desiredRetention: "Infinity",
        weights: "{bad json",
      },
    ]);
    mockSelectWhereOnce([
      {
        id: "subject-1",
        name: "Math",
        description: null,
        totalClasses: null,
        maxMisses: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    mockSelectWhereOnce([]);
    mockSelectWhereOnce([]);
    mockSelectWhereOnce([]);
    mockSelectWhereOnce([]);
    mockSelectWhereOnce([]);

    const { exportDataForUser } = await import(
      "@/features/data-transfer/export"
    );
    const { getDefaultFsrsDesiredRetention, getDefaultFsrsWeights } =
      await import("@/features/flashcards/fsrs");

    const result = await exportDataForUser("user-1");

    if ("errorCode" in result) {
      throw new Error(`Unexpected export error: ${result.errorCode}`);
    }

    expect(result.flashcardScheduler).toEqual({
      desiredRetention: getDefaultFsrsDesiredRetention(),
      weights: getDefaultFsrsWeights(),
    });
  });
});
