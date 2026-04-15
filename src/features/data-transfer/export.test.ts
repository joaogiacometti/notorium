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
    id: "deck_id_column",
    name: "deck_name_column",
    description: "deck_description_column",
    parentDeckId: "deck_parent_deck_id_column",
  },
  flashcard: {
    userId: "flashcard_user_id_column",
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

  it("strips private attachment references from exported notes and flashcards", async () => {
    mockSelectLimitOnce([]);
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
    mockSelectWhereOnce([
      {
        title: "Note 1",
        content:
          '<p>Keep</p><p>/api/attachments/blob?pathname=notorium%2Fnotes%2Fold-user%2Fa.png</p><p><img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fold-user%2Fb.png" alt=""></p>',
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        subjectId: "subject-1",
      },
    ]);
    mockSelectWhereOnce([]);
    mockSelectWhereOnce([]);
    mockSelectWhereOnce([
      {
        front:
          '<p><a href="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fold-user%2Ffront.png">/api/attachments/blob?pathname=notorium%2Fflashcards%2Fold-user%2Ffront.png</a></p>',
        back: "<p>https://cdn.example.com/image.png</p>",
        deckId: "deck-1",
        state: "review",
        dueAt: new Date("2026-01-10T00:00:00.000Z"),
        stability: null,
        difficulty: null,
        ease: 250,
        intervalDays: 5,
        learningStep: null,
        lastReviewedAt: null,
        reviewCount: 1,
        lapseCount: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    mockSelectWhereOnce([]);

    const { exportDataForUser } = await import(
      "@/features/data-transfer/export"
    );

    const result = await exportDataForUser("user-1");

    if ("errorCode" in result) {
      throw new Error(`Unexpected export error: ${result.errorCode}`);
    }

    expect(result.subjects[0]?.notes[0]?.content).toBe("<p>Keep</p>");
    expect(result.flashcards[0]?.front).toBe("");
    expect(result.flashcards[0]?.back).toBe(
      "<p>https://cdn.example.com/image.png</p>",
    );
  });
});
