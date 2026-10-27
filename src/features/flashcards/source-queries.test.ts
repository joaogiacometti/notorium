import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { note } from "@/db/schema";
import type { FlashcardSourceLink } from "@/features/flashcards/source-contract";
import {
  attachFlashcardSources,
  readOwnedFlashcardSource,
} from "@/features/flashcards/source-queries";

type DocumentRow = Omit<FlashcardSourceLink, "kind">;
const state = vi.hoisted(() => ({
  database: null as FakeSourceDatabase | null,
}));
vi.mock("@/db/index", () => ({ getDb: () => state.database }));

class FakeSourceSelection {
  constructor(private database: FakeSourceDatabase) {}
  from(table: unknown) {
    if (table !== note) throw new Error("Expected note source table");
    return this;
  }
  where(condition: SQL | undefined) {
    if (!condition) throw new Error("Expected a source ownership condition");
    this.database.filters.push(new PgDialect().sqlToQuery(condition));
    const rows = this.database.notes;
    return Object.assign(Promise.resolve(rows), {
      limit: async () => rows.slice(0, 1),
    });
  }
}

class FakeSourceDatabase {
  notes: DocumentRow[] = [];
  filters: Array<{ sql: string; params: unknown[] }> = [];
  select() {
    return new FakeSourceSelection(this);
  }
}

describe("flashcard source reads", () => {
  let database: FakeSourceDatabase;
  beforeEach(() => {
    database = new FakeSourceDatabase();
    state.database = database;
  });

  it("validates note source ownership and returns only link fields", async () => {
    const document = { id: "doc-1", title: "Cells", subjectId: "biology" };
    database.notes = [document];
    expect(
      await readOwnedFlashcardSource("owner", { kind: "note", id: "doc-1" }),
    ).toEqual({ ...document, kind: "note" });
    expect(database.filters[0].params).toEqual(["owner", "doc-1"]);
    expect(database.filters[0].sql).toContain('"user_id"');
  });

  it("returns null for a missing or inaccessible source", async () => {
    expect(
      await readOwnedFlashcardSource("owner", { kind: "note", id: "missing" }),
    ).toBeNull();
  });

  it("resolves renamed and moved documents in batches, keeping cards with missing sources", async () => {
    database.notes = [{ id: "n1", title: "Renamed", subjectId: "moved" }];
    const cards = [
      { sourceNoteId: "n1" },
      { sourceNoteId: "deleted" },
      { sourceNoteId: "n1" },
    ];
    const result = await attachFlashcardSources("owner", cards);
    expect(result.map((card) => card.source)).toEqual([
      { ...database.notes[0], kind: "note" },
      null,
      { ...database.notes[0], kind: "note" },
    ]);
    expect(database.filters.map((filter) => filter.params)).toEqual([
      ["owner", "n1", "deleted"],
    ]);
  });

  it("skips database reads for cards without sources", async () => {
    expect(
      await attachFlashcardSources("owner", [{ sourceNoteId: null }]),
    ).toEqual([{ sourceNoteId: null, source: null }]);
    expect(database.filters).toEqual([]);
  });
});
