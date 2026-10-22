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
  private table: unknown;
  from(table: unknown) {
    this.table = table;
    return this;
  }
  where(condition: SQL | undefined) {
    if (!condition) throw new Error("Expected a source ownership condition");
    this.database.filters.push(new PgDialect().sqlToQuery(condition));
    const rows =
      this.table === note ? this.database.notes : this.database.mindmaps;
    return Object.assign(Promise.resolve(rows), {
      limit: async () => rows.slice(0, 1),
    });
  }
}

class FakeSourceDatabase {
  notes: DocumentRow[] = [];
  mindmaps: DocumentRow[] = [];
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

  it.each(["note", "mindmap"] as const)(
    "validates %s source ownership and returns only link fields",
    async (kind) => {
      const document = { id: "doc-1", title: "Cells", subjectId: "biology" };
      if (kind === "note") database.notes = [document];
      else database.mindmaps = [document];
      expect(
        await readOwnedFlashcardSource("owner", { kind, id: "doc-1" }),
      ).toEqual({ ...document, kind });
      expect(database.filters[0].params).toEqual(["owner", "doc-1"]);
      expect(database.filters[0].sql).toContain('"user_id"');
    },
  );

  it("returns null for a missing or inaccessible source", async () => {
    expect(
      await readOwnedFlashcardSource("owner", { kind: "note", id: "missing" }),
    ).toBeNull();
  });

  it("resolves renamed and moved documents in batches, keeping cards with missing sources", async () => {
    database.notes = [{ id: "n1", title: "Renamed", subjectId: "moved" }];
    database.mindmaps = [{ id: "m1", title: "Map", subjectId: "biology" }];
    const cards = [
      { sourceNoteId: "n1" },
      { sourceMindmapId: "m1" },
      { sourceNoteId: "deleted" },
      { sourceNoteId: "n1" },
    ];
    const result = await attachFlashcardSources("owner", cards);
    expect(result.map((card) => card.source)).toEqual([
      { ...database.notes[0], kind: "note" },
      { ...database.mindmaps[0], kind: "mindmap" },
      null,
      { ...database.notes[0], kind: "note" },
    ]);
    expect(database.filters.map((filter) => filter.params)).toEqual([
      ["owner", "n1", "deleted"],
      ["owner", "m1"],
    ]);
  });

  it("skips database reads for cards without sources", async () => {
    expect(
      await attachFlashcardSources("owner", [
        { sourceNoteId: null, sourceMindmapId: null },
      ]),
    ).toEqual([{ sourceNoteId: null, sourceMindmapId: null, source: null }]);
    expect(database.filters).toEqual([]);
  });
});
