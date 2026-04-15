import { and, count, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { deck, flashcard } from "@/db/schema";
import type {
  DeckEntity,
  DeckOption,
  DeckTreeNode,
  DeckWithCount,
} from "@/lib/server/api-contracts";

export async function getTopLevelDecksForUser(
  userId: string,
): Promise<DeckEntity[]> {
  return getDb()
    .select()
    .from(deck)
    .where(and(eq(deck.userId, userId), isNull(deck.parentDeckId)))
    .orderBy(deck.name);
}

export async function getChildDecksForUser(
  userId: string,
  parentDeckId: string,
): Promise<DeckEntity[]> {
  return getDb()
    .select()
    .from(deck)
    .where(and(eq(deck.userId, userId), eq(deck.parentDeckId, parentDeckId)))
    .orderBy(deck.name);
}

export async function getDeckByIdForUser(
  userId: string,
  deckId: string,
): Promise<DeckEntity | null> {
  const results = await getDb()
    .select()
    .from(deck)
    .where(and(eq(deck.id, deckId), eq(deck.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getDeckRecordForUser(
  userId: string,
  deckId: string,
): Promise<{
  id: string;
  parentDeckId: string | null;
  name: string;
} | null> {
  const results = await getDb()
    .select({
      id: deck.id,
      parentDeckId: deck.parentDeckId,
      name: deck.name,
    })
    .from(deck)
    .where(and(eq(deck.id, deckId), eq(deck.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function countDecksForUser(userId: string): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(deck)
    .where(eq(deck.userId, userId));

  return result[0]?.total ?? 0;
}

export async function countChildDecksForUser(
  userId: string,
  parentDeckId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(deck)
    .where(and(eq(deck.userId, userId), eq(deck.parentDeckId, parentDeckId)));

  return result[0]?.total ?? 0;
}

export async function countFlashcardsByDeckForUser(
  userId: string,
  deckId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(flashcard)
    .where(and(eq(flashcard.deckId, deckId), eq(flashcard.userId, userId)));

  return result[0]?.total ?? 0;
}

export async function getDescendantDeckIds(
  userId: string,
  deckId: string,
): Promise<string[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE deck_tree AS (
        SELECT id
        FROM deck
        WHERE id = ${deckId} AND user_id = ${userId}
        UNION ALL
        SELECT d.id
        FROM deck d
        INNER JOIN deck_tree dt ON d.parent_deck_id = dt.id
        WHERE d.user_id = ${userId}
      )
      SELECT id FROM deck_tree
    `,
  );

  return (rows as unknown as { rows: Array<{ id: string }> }).rows.map(
    (r) => r.id,
  );
}

export async function getDeckAncestors(
  userId: string,
  deckId: string,
): Promise<DeckEntity[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT d.*
        FROM deck d
        WHERE d.id = ${deckId} AND d.user_id = ${userId}
        UNION ALL
        SELECT d.*
        FROM deck d
        INNER JOIN ancestors a ON d.id = a.parent_deck_id
        WHERE d.user_id = ${userId}
      )
      SELECT * FROM ancestors
      WHERE id != ${deckId}
      ORDER BY (
        SELECT count(*) FROM (
          WITH RECURSIVE depth AS (
            SELECT id, parent_deck_id, 0 AS lvl
            FROM deck WHERE id = ${deckId}
            UNION ALL
            SELECT d.id, d.parent_deck_id, depth.lvl + 1
            FROM deck d INNER JOIN depth ON d.id = depth.parent_deck_id
          )
          SELECT * FROM depth
        ) sub WHERE sub.id = ancestors.id
      ) DESC
    `,
  );

  return (rows as unknown as { rows: DeckEntity[] }).rows;
}

export async function getDeckPathForUser(
  userId: string,
  deckId: string,
): Promise<string> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, name, parent_deck_id, 0 AS depth
        FROM deck
        WHERE id = ${deckId} AND user_id = ${userId}
        UNION ALL
        SELECT d.id, d.name, d.parent_deck_id, a.depth + 1
        FROM deck d
        INNER JOIN ancestors a ON d.id = a.parent_deck_id
        WHERE d.user_id = ${userId}
      )
      SELECT name FROM ancestors ORDER BY depth DESC
    `,
  );

  const names = (rows as unknown as { rows: Array<{ name: string }> }).rows.map(
    (r) => r.name,
  );
  return names.join("::");
}

export async function getDeckDepthForUser(
  userId: string,
  deckId: string,
): Promise<number | null> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_deck_id, 1 AS depth
        FROM deck
        WHERE id = ${deckId} AND user_id = ${userId}
        UNION ALL
        SELECT d.id, d.parent_deck_id, a.depth + 1
        FROM deck d
        INNER JOIN ancestors a ON d.id = a.parent_deck_id
        WHERE d.user_id = ${userId}
      )
      SELECT MAX(depth) AS depth FROM ancestors
    `,
  );

  const result = (rows as unknown as { rows: Array<{ depth: number | null }> })
    .rows[0];
  return result?.depth ?? null;
}

export async function getAllDecksWithPathsForUser(
  userId: string,
): Promise<DeckOption[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE deck_paths AS (
        SELECT
          d.*,
          d.name::text AS path
        FROM deck d
        WHERE d.user_id = ${userId} AND d.parent_deck_id IS NULL
        UNION ALL
        SELECT
          d.*,
          (dp.path || '::' || d.name)::text AS path
        FROM deck d
        INNER JOIN deck_paths dp ON d.parent_deck_id = dp.id
        WHERE d.user_id = ${userId}
      )
      SELECT * FROM deck_paths ORDER BY path
    `,
  );

  return (rows as unknown as { rows: DeckOption[] }).rows;
}

export async function getDeckWithAncestorsForUser(
  userId: string,
  deckId: string,
): Promise<(DeckEntity & { ancestors: DeckEntity[]; path: string }) | null> {
  const [currentDeck, ancestors, path] = await Promise.all([
    getDeckByIdForUser(userId, deckId),
    getDeckAncestors(userId, deckId),
    getDeckPathForUser(userId, deckId),
  ]);

  if (!currentDeck) {
    return null;
  }

  return {
    ...currentDeck,
    ancestors,
    path,
  };
}

export async function searchDecksByPathForUser(
  userId: string,
  query: string,
): Promise<DeckOption[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const decks = await getAllDecksWithPathsForUser(userId);

  if (normalizedQuery.length === 0) {
    return decks;
  }

  return decks.filter((currentDeck) =>
    currentDeck.path.toLowerCase().includes(normalizedQuery),
  );
}

export async function getDeckTreeForUser(
  userId: string,
): Promise<DeckTreeNode[]> {
  const allDecks = await getDb()
    .select()
    .from(deck)
    .where(eq(deck.userId, userId))
    .orderBy(deck.name);

  const flashcardCounts = await getDb()
    .select({ deckId: flashcard.deckId, count: count() })
    .from(flashcard)
    .where(eq(flashcard.userId, userId))
    .groupBy(flashcard.deckId)
    .then((rows) => new Map(rows.map((r) => [r.deckId, r.count])));

  const nodeMap = new Map<string, DeckTreeNode>();

  for (const d of allDecks) {
    nodeMap.set(d.id, {
      ...d,
      flashcardCount: flashcardCounts.get(d.id) ?? 0,
      children: [],
      path: "",
    });
  }

  function buildPath(nodeId: string): string {
    const node = nodeMap.get(nodeId);
    if (!node) {
      return "";
    }
    if (!node.parentDeckId) {
      return node.name;
    }
    const parentPath = buildPath(node.parentDeckId);
    return parentPath ? `${parentPath}::${node.name}` : node.name;
  }

  const roots: DeckTreeNode[] = [];

  for (const node of nodeMap.values()) {
    node.path = buildPath(node.id);
    if (node.parentDeckId) {
      const parent = nodeMap.get(node.parentDeckId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  function applySubtreeFlashcardCounts(node: DeckTreeNode): number {
    const childFlashcardCount = node.children.reduce(
      (total, childNode) => total + applySubtreeFlashcardCounts(childNode),
      0,
    );

    node.flashcardCount += childFlashcardCount;
    return node.flashcardCount;
  }

  for (const rootNode of roots) {
    applySubtreeFlashcardCounts(rootNode);
  }

  return roots;
}

export async function getDecksWithCountForUser(
  userId: string,
): Promise<DeckWithCount[]> {
  const decks = await getDb()
    .select()
    .from(deck)
    .where(eq(deck.userId, userId))
    .orderBy(deck.name);

  if (decks.length === 0) {
    return [];
  }

  const counts = await getDb()
    .select({ deckId: flashcard.deckId, count: count() })
    .from(flashcard)
    .where(eq(flashcard.userId, userId))
    .groupBy(flashcard.deckId)
    .then((rows) => new Map(rows.map((r) => [r.deckId, r.count])));

  return decks.map((d) => ({
    ...d,
    flashcardCount: counts.get(d.id) ?? 0,
  }));
}

export async function isDeckAncestorOf(
  userId: string,
  potentialAncestorId: string,
  targetId: string,
): Promise<boolean> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT parent_deck_id AS id
        FROM deck
        WHERE id = ${targetId} AND user_id = ${userId}
        UNION ALL
        SELECT d.parent_deck_id
        FROM deck d
        INNER JOIN ancestors a ON d.id = a.id
        WHERE d.user_id = ${userId} AND d.parent_deck_id IS NOT NULL
      )
      SELECT 1 FROM ancestors WHERE id = ${potentialAncestorId} LIMIT 1
    `,
  );

  return (rows as unknown as { rows: unknown[] }).rows.length > 0;
}
