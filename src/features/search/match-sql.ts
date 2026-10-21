import { type AnyColumn, desc, or, type SQL, sql } from "drizzle-orm";
import { buildContainsSearchPattern } from "@/lib/search/pattern";

/** Filter and ordering of a multi-term search, for `.where()` and `.orderBy()`. */
export interface TermSearchSql {
  where: SQL | undefined;
  orderBy: SQL[];
}

/**
 * Case- and accent-insensitive `ILIKE` of `column` against an escaped pattern
 * from `buildContainsSearchPattern`; "funcao" matches "Função". Wraps the
 * column exactly like the `*_unaccent_trgm_idx` indexes in `src/db/schema.ts`;
 * any other wrapping (lower(), coalesce()) stops Postgres from using them.
 *
 * @example
 * where(foldedContains(note.title, buildContainsSearchPattern("funcao")));
 */
export function foldedContains(column: AnyColumn, searchPattern: string): SQL {
  return sql`${folded(column)} ilike ${folded(searchPattern)}`;
}

/**
 * Rows where any term is contained in any of `columns` or is typo-close
 * (pg_trgm `<%`, threshold 0.6) to a word run in `fuzzyColumn`, a short field
 * such as a title. Ranked by the best fuzzy score, then most recent.
 *
 * @example
 * const search = buildTermSearch(["mitose"], [note.title, note.content], note.title, note.updatedAt);
 * query.where(and(owner, search.where)).orderBy(...search.orderBy);
 */
export function buildTermSearch(
  terms: string[],
  columns: AnyColumn[],
  fuzzyColumn: AnyColumn,
  updatedAt: AnyColumn,
): TermSearchSql {
  const matches = terms.flatMap((term) => {
    const pattern = buildContainsSearchPattern(term);
    return [
      ...columns.map((column) => foldedContains(column, pattern)),
      sql`${folded(term)} <% ${folded(fuzzyColumn)}`,
    ];
  });
  const scores = terms.map(
    (term) => sql`word_similarity(${folded(term)}, ${folded(fuzzyColumn)})`,
  );

  return {
    where: or(...matches),
    orderBy: [
      desc(sql`greatest(${sql.join(scores, sql`, `)})`),
      desc(updatedAt),
    ],
  };
}

// A column folds as a column reference, a string as a bound parameter.
function folded(value: AnyColumn | string): SQL<string> {
  return sql<string>`immutable_unaccent(${value})`;
}
