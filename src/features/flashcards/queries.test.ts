import { beforeEach, describe, expect, it, vi } from "vitest";
import { flashcard, note } from "@/db/schema";
import {
  getFlashcardsManageOrderBy,
  getFlashcardWithSourceByIdForUser,
} from "@/features/flashcards/queries";

const dbState = vi.hoisted(() => ({
  database: null as FakeFlashcardSourceDatabase | null,
}));
vi.mock("@/db/index", () => ({ getDb: () => dbState.database }));

class FakeFlashcardSourceDatabase {
  cards: Array<Record<string, unknown>> = [];
  notes: Array<{ id: string; title: string; subjectId: string }> = [];
  select() {
    let rows: unknown[] = [];
    const selection = {
      from: (table: unknown) => {
        if (table === flashcard)
          rows = this.cards.map((card) => ({ flashcard: card }));
        if (table === note) rows = this.notes;
        return selection;
      },
      where: () =>
        Object.assign(Promise.resolve(rows), {
          limit: async () => rows.slice(0, 1),
        }),
    };
    return selection;
  }
}

function getSqlChunkText(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("queryChunks" in value)
  ) {
    return "";
  }

  return (value as { queryChunks: unknown[] }).queryChunks
    .map((chunk) => {
      if (typeof chunk === "string") {
        return chunk;
      }

      if (
        typeof chunk === "object" &&
        chunk !== null &&
        "value" in chunk &&
        Array.isArray(chunk.value)
      ) {
        return chunk.value.join("");
      }

      return "";
    })
    .join(" ");
}

describe("getFlashcardsManageOrderBy", () => {
  it("ranks front matches before back and deck matches when searching", () => {
    const orderBy = getFlashcardsManageOrderBy("PERT", "%PERT%");

    expect(orderBy).toHaveLength(2);
    expect(getSqlChunkText(orderBy[0])).toContain("then 0");
    expect(getSqlChunkText(orderBy[0])).toContain("then 1");
    expect(getSqlChunkText(orderBy[0])).toContain("then 2");
  });

  it("keeps updated-at ordering for empty search", () => {
    expect(getFlashcardsManageOrderBy("", "%%")).toHaveLength(1);
  });
});

describe("getFlashcardWithSourceByIdForUser", () => {
  let database: FakeFlashcardSourceDatabase;
  beforeEach(() => {
    database = new FakeFlashcardSourceDatabase();
    dbState.database = database;
  });

  it("attaches the current source link so the edit dialog can show it", async () => {
    database.cards = [{ id: "c1", sourceNoteId: "n1" }];
    database.notes = [{ id: "n1", title: "Cells", subjectId: "biology" }];

    const card = await getFlashcardWithSourceByIdForUser("owner", "c1");

    expect(card?.source).toEqual({
      kind: "note",
      id: "n1",
      title: "Cells",
      subjectId: "biology",
    });
  });

  it("returns null for a missing card", async () => {
    expect(
      await getFlashcardWithSourceByIdForUser("owner", "missing"),
    ).toBeNull();
  });
});
