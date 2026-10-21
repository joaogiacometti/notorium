import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { note } from "@/db/schema";
import { buildTermSearch, foldedContains } from "@/features/search/match-sql";

const dialect = new PgDialect();

// The rendered SQL is the contract here: the planner only uses the search
// indexes when the column is wrapped exactly like `immutable_unaccent(col)`.
describe("folded search SQL", () => {
  it("folds both sides of a contains match and binds the pattern", () => {
    const query = dialect.sqlToQuery(foldedContains(note.title, "%funcao%"));

    expect(query.sql).toBe(
      'immutable_unaccent("note"."title") ilike immutable_unaccent($1)',
    );
    expect(query.params).toEqual(["%funcao%"]);
  });

  it("matches each term in every column and fuzzily on one", () => {
    const search = buildTermSearch(
      ["mito", "50%"],
      [note.title, note.content],
      note.title,
      note.updatedAt,
    );
    const query = dialect.sqlToQuery(search.where ?? sql``);

    expect(query.sql.match(/ ilike /g)).toHaveLength(4);
    expect(query.sql).toContain(
      'immutable_unaccent($3) <% immutable_unaccent("note"."title")',
    );
    expect(query.params).toEqual([
      "%mito%",
      "%mito%",
      "mito",
      String.raw`%50\%%`,
      String.raw`%50\%%`,
      "50%",
    ]);
  });

  it("ranks by the best fuzzy score across terms, then recency", () => {
    const search = buildTermSearch(
      ["mitose", "mitosis"],
      [note.title],
      note.title,
      note.updatedAt,
    );
    const [score, recency] = search.orderBy.map((part) =>
      dialect.sqlToQuery(part),
    );

    expect(score?.sql).toBe(
      'greatest(word_similarity(immutable_unaccent($1), immutable_unaccent("note"."title")), word_similarity(immutable_unaccent($2), immutable_unaccent("note"."title"))) desc',
    );
    expect(score?.params).toEqual(["mitose", "mitosis"]);
    expect(recency?.sql).toBe('"note"."updated_at" desc');
  });
});
