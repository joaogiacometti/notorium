import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flashcard, folder, note, pdfDocument } from "@/db/schema";

const rowsByTable = new Map<unknown, unknown[]>();
const whereByTable = new Map<unknown, SQL>();

// Resolves each select chain with the rows registered for the table passed to
// `from`, whether the chain ends in `orderBy` (folders) or `groupBy` (counts),
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

const newCardAllowanceMock = vi.fn();
vi.mock("@/features/flashcard-review/new-card-limit", () => ({
  getNewCardAllowanceForToday: newCardAllowanceMock,
}));

function makeFolder(id: string, name: string, parentFolderId: string | null) {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  return {
    id,
    userId: "user-1",
    name,
    parentFolderId,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("getFolderTreeForUser", () => {
  beforeEach(() => {
    rowsByTable.clear();
    whereByTable.clear();
    newCardAllowanceMock.mockReset().mockResolvedValue(20);
  });

  it("nests children under parents with :: paths and rolled-up counts", async () => {
    rowsByTable.set(folder, [
      makeFolder("math", "Math", null),
      makeFolder("calc", "Calc", "math"),
      makeFolder("history", "History", null),
    ]);
    rowsByTable.set(note, [
      { folderId: "math", count: 1 },
      { folderId: "calc", count: 2 },
    ]);
    rowsByTable.set(pdfDocument, [{ folderId: "calc", count: 1 }]);
    rowsByTable.set(flashcard, [
      { folderId: "calc", total: 4, new: 0 },
      { folderId: null, total: 9, new: 0 },
    ]);

    const { getFolderTreeForUser } = await import(
      "@/features/folders/tree-queries"
    );

    const roots = await getFolderTreeForUser("user-1", "UTC");

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
    rowsByTable.set(folder, [makeFolder("math", "Math", null)]);
    const { getFolderTreeForUser } = await import(
      "@/features/folders/tree-queries"
    );

    await getFolderTreeForUser("user-1", "UTC");

    const dueCondition = whereByTable.get(flashcard);
    expect(dueCondition).toBeDefined();
    const { sql } = new PgDialect().sqlToQuery(dueCondition as SQL);
    expect(sql).toContain('"flashcard"."state" in ($');
  });

  it("caps due new cards per subtree at today's remaining allowance", async () => {
    rowsByTable.set(folder, [
      makeFolder("math", "Math", null),
      makeFolder("calc", "Calc", "math"),
    ]);
    rowsByTable.set(flashcard, [
      { folderId: "math", total: 3, new: 3 },
      { folderId: "calc", total: 5, new: 4 },
    ]);
    newCardAllowanceMock.mockResolvedValue(5);
    const { getFolderTreeForUser } = await import(
      "@/features/folders/tree-queries"
    );

    const [math] = await getFolderTreeForUser("user-1", "America/Sao_Paulo");

    // Calc: 1 started + min(4 new, 5). Math subtree: 1 started + min(7 new, 5).
    expect(math?.children[0]?.dueFlashcardCount).toBe(5);
    expect(math?.dueFlashcardCount).toBe(6);
    expect(newCardAllowanceMock).toHaveBeenCalledWith(
      "user-1",
      expect.any(Date),
      "America/Sao_Paulo",
    );
  });
});
