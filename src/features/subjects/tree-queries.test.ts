import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flashcard, mindmap, note, subject } from "@/db/schema";

const rowsByTable = new Map<unknown, unknown[]>();
const whereByTable = new Map<unknown, SQL>();

// Resolves each select chain with the rows registered for the table passed to
// `from`, whether the chain ends in `orderBy` (subjects) or `groupBy` (counts),
// and keeps each table's `where` condition for filter assertions.
function createFakeTreeDb() {
  return {
    select: () => ({
      from: (table: unknown) => {
        const rows = Promise.resolve(rowsByTable.get(table) ?? []);
        return {
          where: (condition: SQL) => {
            whereByTable.set(table, condition);
            return { orderBy: () => rows, groupBy: () => rows };
          },
        };
      },
    }),
  };
}

vi.mock("@/db/index", () => ({ getDb: createFakeTreeDb }));

function makeSubject(id: string, name: string, parentSubjectId: string | null) {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  return {
    id,
    userId: "user-1",
    name,
    parentSubjectId,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("getSubjectTreeForUser", () => {
  beforeEach(() => {
    rowsByTable.clear();
    whereByTable.clear();
  });

  it("nests children under parents with :: paths and rolled-up counts", async () => {
    rowsByTable.set(subject, [
      makeSubject("math", "Math", null),
      makeSubject("calc", "Calc", "math"),
      makeSubject("history", "History", null),
    ]);
    rowsByTable.set(note, [
      { subjectId: "math", count: 1 },
      { subjectId: "calc", count: 2 },
    ]);
    rowsByTable.set(mindmap, [{ subjectId: "calc", count: 1 }]);
    rowsByTable.set(flashcard, [
      { subjectId: "calc", count: 4 },
      { subjectId: null, count: 9 },
    ]);

    const { getSubjectTreeForUser } = await import(
      "@/features/subjects/tree-queries"
    );

    const roots = await getSubjectTreeForUser("user-1");

    expect(roots.map((root) => root.id)).toEqual(["math", "history"]);
    const [math, history] = roots;
    expect(math).toMatchObject({
      path: "Math",
      documentCount: 4,
      dueFlashcardCount: 4,
    });
    expect(math?.children).toEqual([
      expect.objectContaining({
        id: "calc",
        path: "Math::Calc",
        documentCount: 3,
        dueFlashcardCount: 4,
        children: [],
      }),
    ]);
    expect(history).toMatchObject({ documentCount: 0, dueFlashcardCount: 0 });
  });

  // Regression: the badge counted only `dueAt <= now`, so it showed fewer
  // cards than the review queue, which also includes learn-ahead cards.
  it("counts due cards with the review queue's learn-ahead rule", async () => {
    rowsByTable.set(subject, [makeSubject("math", "Math", null)]);
    const { getSubjectTreeForUser } = await import(
      "@/features/subjects/tree-queries"
    );

    await getSubjectTreeForUser("user-1");

    const dueCondition = whereByTable.get(flashcard);
    expect(dueCondition).toBeDefined();
    const { sql } = new PgDialect().sqlToQuery(dueCondition as SQL);
    expect(sql).toContain('"flashcard"."state" in ($');
  });
});
