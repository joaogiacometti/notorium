import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeFlashcardUpdateDb {
  setValues: Record<string, unknown> | null = null;
  whereCondition: unknown = null;

  update() {
    return {
      set: (values: Record<string, unknown>) => {
        this.setValues = values;
        return {
          where: async (condition: unknown) => {
            this.whereCondition = condition;
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
  and: (...conditions: unknown[]) => conditions,
  eq: (column: unknown, value: unknown) => ({ column, value }),
  inArray: (column: unknown, values: unknown[]) => ({ column, values }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));

vi.mock("@/db/schema", () => ({
  flashcard: {
    id: "flashcard_id_column",
    userId: "flashcard_user_id_column",
    updatedAt: "flashcard_updated_at_column",
  },
}));

beforeEach(() => {
  fakeDb.setValues = null;
  fakeDb.whereCondition = null;
  ownedRecords.length = 0;
  ownedRecords.push(
    { id: "card-1", folderId: "folder-1" },
    { id: "card-2", folderId: "folder-2" },
  );
});

describe("setFlashcardsArchivedForUser", () => {
  it("archives the user's cards and drops their study-later marks", async () => {
    const { setFlashcardsArchivedForUser } = await import(
      "./archive-mutations"
    );

    const result = await setFlashcardsArchivedForUser("user-1", {
      ids: ["card-1", "card-2"],
      archived: true,
    });

    expect(result.success && result.archivedAt).toBeInstanceOf(Date);
    expect(fakeDb.setValues?.archivedAt).toBeInstanceOf(Date);
    expect(fakeDb.setValues).toHaveProperty("studyLaterAt", null);
    expect(fakeDb.whereCondition).toContainEqual({
      column: "flashcard_user_id_column",
      value: "user-1",
    });
  });

  it("unarchives without touching study later", async () => {
    const { setFlashcardsArchivedForUser } = await import(
      "./archive-mutations"
    );

    const result = await setFlashcardsArchivedForUser("user-1", {
      ids: ["card-1"],
      archived: false,
    });

    expect(result).toMatchObject({ success: true, archivedAt: null });
    expect(fakeDb.setValues?.archivedAt).toBeNull();
    expect(fakeDb.setValues).not.toHaveProperty("studyLaterAt");
  });

  it("rejects the batch when any card is not the user's", async () => {
    const { setFlashcardsArchivedForUser } = await import(
      "./archive-mutations"
    );

    const result = await setFlashcardsArchivedForUser("user-1", {
      ids: ["card-1", "someone-elses"],
      archived: true,
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "flashcards.notFound",
    });
    expect(fakeDb.setValues).toBeNull();
  });
});
