import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeFlashcardUpdateDb {
  returningRows: Array<Record<string, unknown>> = [];
  setValues: Record<string, unknown> | null = null;
  whereCondition: unknown = null;

  update() {
    return {
      set: (values: Record<string, unknown>) => {
        this.setValues = values;
        return {
          where: (condition: unknown) => {
            this.whereCondition = condition;
            return Object.assign(Promise.resolve(), {
              returning: async () => this.returningRows,
            });
          },
        };
      },
    };
  }
}

const fakeDb = new FakeFlashcardUpdateDb();
const ownedRecords: Array<{ id: string; folderId: string }> = [];

vi.mock("@/db/index", () => ({ getDb: () => fakeDb }));

vi.mock("@/features/flashcards/queries", () => ({
  getFlashcardRecordsForUser: async (_userId: string, ids: string[]) =>
    ownedRecords.filter((record) => ids.includes(record.id)),
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => conditions.filter(Boolean),
  eq: (column: unknown, value: unknown) => ({ column, value }),
  inArray: (column: unknown, values: unknown[]) => ({ column, values }),
  isNull: (column: unknown) => ({ column, isNull: true }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
    studyLaterAt: "flashcard_study_later_at_column",
    archivedAt: "flashcard_archived_at_column",
    updatedAt: "flashcard_updated_at_column",
  },
}));

const activeOnly = { column: "flashcard_archived_at_column", isNull: true };

beforeEach(() => {
  fakeDb.returningRows = [];
  fakeDb.setValues = null;
  fakeDb.whereCondition = null;
  ownedRecords.length = 0;
});

describe("setFlashcardStudyLaterForUser", () => {
  it("marks the user's active card with the current time", async () => {
    const markedAt = new Date("2026-10-30T10:00:00.000Z");
    fakeDb.returningRows = [{ studyLaterAt: markedAt }];
    const { setFlashcardStudyLaterForUser } = await import(
      "./study-later-mutations"
    );

    const result = await setFlashcardStudyLaterForUser("user-1", {
      id: "card-1",
      studyLater: true,
    });

    expect(result).toEqual({ success: true, studyLaterAt: markedAt });
    expect(fakeDb.setValues?.studyLaterAt).toBeInstanceOf(Date);
    expect(fakeDb.whereCondition).toEqual([
      { column: "flashcard_id_column", value: "card-1" },
      { column: "flashcard_user_id_column", value: "user-1" },
      activeOnly,
    ]);
  });

  it("clears the mark on any card, archived or not", async () => {
    fakeDb.returningRows = [{ studyLaterAt: null }];
    const { setFlashcardStudyLaterForUser } = await import(
      "./study-later-mutations"
    );

    const result = await setFlashcardStudyLaterForUser("user-1", {
      id: "card-1",
      studyLater: false,
    });

    expect(result).toEqual({ success: true, studyLaterAt: null });
    expect(fakeDb.setValues?.studyLaterAt).toBeNull();
    expect(fakeDb.whereCondition).not.toContainEqual(activeOnly);
  });

  it("returns not found when the user owns no such card", async () => {
    const { setFlashcardStudyLaterForUser } = await import(
      "./study-later-mutations"
    );

    const result = await setFlashcardStudyLaterForUser("user-1", {
      id: "missing",
      studyLater: true,
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "flashcards.notFound",
    });
  });
});

describe("bulkSetFlashcardsStudyLaterForUser", () => {
  it("marks only active cards", async () => {
    ownedRecords.push(
      { id: "card-1", folderId: "folder-1" },
      { id: "card-2", folderId: "folder-1" },
    );
    const { bulkSetFlashcardsStudyLaterForUser } = await import(
      "./study-later-mutations"
    );

    const result = await bulkSetFlashcardsStudyLaterForUser("user-1", {
      ids: ["card-1", "card-2"],
      studyLater: true,
    });

    expect(result.success && result.studyLaterAt).toBeInstanceOf(Date);
    expect(fakeDb.whereCondition).toContainEqual(activeOnly);
    expect(fakeDb.whereCondition).toContainEqual({
      column: "flashcard_user_id_column",
      value: "user-1",
    });
  });

  it("rejects the batch when any card is not the user's", async () => {
    ownedRecords.push({ id: "card-1", folderId: "folder-1" });
    const { bulkSetFlashcardsStudyLaterForUser } = await import(
      "./study-later-mutations"
    );

    const result = await bulkSetFlashcardsStudyLaterForUser("user-1", {
      ids: ["card-1", "someone-elses"],
      studyLater: false,
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "flashcards.notFound",
    });
    expect(fakeDb.setValues).toBeNull();
  });
});
