import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeFlashcardUpdateDb {
  returningRows: Array<{ studyLaterAt: Date | null }> = [];
  setValues: Record<string, unknown> | null = null;
  whereCondition: unknown = null;

  update() {
    return {
      set: (values: Record<string, unknown>) => {
        this.setValues = values;
        return {
          where: (condition: unknown) => {
            this.whereCondition = condition;
            return { returning: async () => this.returningRows };
          },
        };
      },
    };
  }
}

const fakeDb = new FakeFlashcardUpdateDb();

vi.mock("@/db/index", () => ({ getDb: () => fakeDb }));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => conditions,
  eq: (column: unknown, value: unknown) => ({ column, value }),
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
    updatedAt: "flashcard_updated_at_column",
  },
}));

describe("setFlashcardStudyLaterForUser", () => {
  beforeEach(() => {
    fakeDb.returningRows = [];
    fakeDb.setValues = null;
    fakeDb.whereCondition = null;
  });

  it("marks the user's card with the current time", async () => {
    const markedAt = new Date("2026-10-30T10:00:00.000Z");
    fakeDb.returningRows = [{ studyLaterAt: markedAt }];
    const { setFlashcardStudyLaterForUser } = await import(
      "./study-later-mutations"
    );

    const result = await setFlashcardStudyLaterForUser("user-1", {
      id: "card-1",
      studyLater: true,
    });

    expect(result).toEqual({
      success: true,
      studyLaterAt: markedAt,
    });
    expect(fakeDb.setValues?.studyLaterAt).toBeInstanceOf(Date);
    expect(fakeDb.whereCondition).toEqual([
      { column: "flashcard_id_column", value: "card-1" },
      { column: "flashcard_user_id_column", value: "user-1" },
    ]);
  });

  it("clears the mark", async () => {
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
