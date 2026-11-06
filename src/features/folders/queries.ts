import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { folder } from "@/db/schema";
import type {
  FolderAncestor,
  FolderEntity,
  FolderOption,
} from "@/lib/server/api-contracts";

type FolderReadExecutor = Pick<ReturnType<typeof getDb>, "select" | "execute">;

export async function getFolderByIdForUser(
  userId: string,
  folderId: string,
): Promise<FolderEntity | null> {
  const results = await getDb()
    .select()
    .from(folder)
    .where(and(eq(folder.id, folderId), eq(folder.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getFolderRecordForUser(
  userId: string,
  folderId: string,
): Promise<{ id: string; name: string } | null> {
  const results = await getDb()
    .select({ id: folder.id, name: folder.name })
    .from(folder)
    .where(and(eq(folder.id, folderId), eq(folder.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function countTotalFoldersForUser(
  userId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(folder)
    .where(eq(folder.userId, userId));

  return result[0]?.total ?? 0;
}

export async function countChildFoldersForUser(
  userId: string,
  parentFolderId: string,
  executor: FolderReadExecutor = getDb(),
): Promise<number> {
  const result = await executor
    .select({ total: count() })
    .from(folder)
    .where(
      and(eq(folder.userId, userId), eq(folder.parentFolderId, parentFolderId)),
    );

  return result[0]?.total ?? 0;
}

export async function getFolderTreeRecordForUser(
  userId: string,
  folderId: string,
  executor: FolderReadExecutor = getDb(),
): Promise<{
  id: string;
  parentFolderId: string | null;
  name: string;
} | null> {
  const results = await executor
    .select({
      id: folder.id,
      parentFolderId: folder.parentFolderId,
      name: folder.name,
    })
    .from(folder)
    .where(and(eq(folder.id, folderId), eq(folder.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getDescendantFolderIds(
  userId: string,
  folderId: string,
): Promise<string[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE folder_tree AS (
        SELECT id
        FROM ${folder}
        WHERE id = ${folderId} AND ${folder.userId} = ${userId}
        UNION ALL
        SELECT ${folder.id}
        FROM ${folder}
        INNER JOIN folder_tree st ON ${folder.parentFolderId} = st.id
        WHERE ${folder.userId} = ${userId}
      )
      SELECT id FROM folder_tree
    `,
  );

  return (rows as unknown as { rows: Array<{ id: string }> }).rows.map(
    (r) => r.id,
  );
}

/**
 * Returns the owned ancestor chain in deterministic root-first order.
 *
 * @example await getFolderAncestors(userId, folderId);
 */
export async function getFolderAncestors(
  userId: string,
  folderId: string,
): Promise<FolderAncestor[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT ${folder.id}, ${folder.name}, ${folder.parentFolderId} AS parent_id, 0 AS depth
        FROM ${folder}
        WHERE ${folder.id} = ${folderId} AND ${folder.userId} = ${userId}
        UNION ALL
        SELECT ${folder.id}, ${folder.name}, ${folder.parentFolderId}, a.depth + 1
        FROM ${folder}
        INNER JOIN ancestors a ON ${folder.id} = a.parent_id
        WHERE ${folder.userId} = ${userId}
      )
      SELECT id, name, depth FROM ancestors
      WHERE id != ${folderId}
      ORDER BY depth DESC
    `,
  );

  const ancestorRows = (
    rows as unknown as {
      rows: Array<{
        id: string;
        name: string;
        depth: number;
      }>;
    }
  ).rows;

  return ancestorRows
    .sort((left, right) => right.depth - left.depth)
    .map(({ id, name }) => ({ id, name }));
}

export async function getFolderPathForUser(
  userId: string,
  folderId: string,
): Promise<string> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, name, ${folder.parentFolderId} AS parent_id, 0 AS depth
        FROM ${folder}
        WHERE id = ${folderId} AND ${folder.userId} = ${userId}
        UNION ALL
        SELECT ${folder.id}, ${folder.name}, ${folder.parentFolderId}, a.depth + 1
        FROM ${folder}
        INNER JOIN ancestors a ON ${folder.id} = a.parent_id
        WHERE ${folder.userId} = ${userId}
      )
      SELECT name FROM ancestors ORDER BY depth DESC
    `,
  );

  const names = (rows as unknown as { rows: Array<{ name: string }> }).rows.map(
    (r) => r.name,
  );
  return names.join("::");
}

export async function getFolderDepthForUser(
  userId: string,
  folderId: string,
  executor: FolderReadExecutor = getDb(),
): Promise<number | null> {
  const rows = await executor.execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, ${folder.parentFolderId} AS parent_id, 1 AS depth
        FROM ${folder}
        WHERE id = ${folderId} AND ${folder.userId} = ${userId}
        UNION ALL
        SELECT ${folder.id}, ${folder.parentFolderId}, a.depth + 1
        FROM ${folder}
        INNER JOIN ancestors a ON ${folder.id} = a.parent_id
        WHERE ${folder.userId} = ${userId}
      )
      SELECT MAX(depth) AS depth FROM ancestors
    `,
  );

  const result = (rows as unknown as { rows: Array<{ depth: number | null }> })
    .rows[0];
  return result?.depth ?? null;
}

/**
 * Returns the number of levels occupied by a folder and its deepest
 * descendant. A leaf has height 1. Used to keep subtree moves within the cap.
 *
 * @example await getFolderSubtreeHeightForUser(userId, folderId); // 1
 */
export async function getFolderSubtreeHeightForUser(
  userId: string,
  folderId: string,
  executor: FolderReadExecutor = getDb(),
): Promise<number> {
  const rows = await executor.execute(
    sql`
      WITH RECURSIVE descendants AS (
        SELECT id, 1 AS depth
        FROM ${folder}
        WHERE id = ${folderId} AND ${folder.userId} = ${userId}
        UNION ALL
        SELECT ${folder.id}, d.depth + 1
        FROM ${folder}
        INNER JOIN descendants d ON ${folder.parentFolderId} = d.id
        WHERE ${folder.userId} = ${userId}
      )
      SELECT MAX(depth) AS height FROM descendants
    `,
  );

  const result = (rows as unknown as { rows: Array<{ height: number | null }> })
    .rows[0];
  return result?.height ?? 1;
}

/**
 * Every folder reachable from a root, with its `::`-joined `path`, ordered by
 * path. The recursive CTE only computes ids and paths; the rows themselves
 * come from Drizzle so they keep the camelCase `FolderEntity` shape and real
 * `Date`s (raw `execute` rows are snake_case with string timestamps).
 *
 * @example
 * const options = await getAllFoldersWithPathsForUser(userId);
 * options[0]?.path; // "Math::Calculus"
 */
export async function getAllFoldersWithPathsForUser(
  userId: string,
): Promise<FolderOption[]> {
  const [pathRows, folders] = await Promise.all([
    getFolderPathRowsForUser(userId),
    getDb().select().from(folder).where(eq(folder.userId, userId)),
  ]);
  const foldersById = new Map(folders.map((row) => [row.id, row]));

  return pathRows.flatMap(({ id, path }) => {
    const row = foldersById.get(id);
    return row ? [{ ...row, path }] : [];
  });
}

/**
 * Id and `::`-joined path of every folder reachable from a root, from one
 * recursive query. Use it when only paths are needed, not full folder rows.
 *
 * @example
 * const rows = await getFolderPathRowsForUser(userId);
 */
export async function getFolderPathRowsForUser(
  userId: string,
): Promise<Array<{ id: string; path: string }>> {
  const result = await getDb().execute(
    sql`
      WITH RECURSIVE folder_paths AS (
        SELECT
          ${folder.id},
          ${folder.name}::text AS path
        FROM ${folder}
        WHERE ${folder.userId} = ${userId} AND ${folder.parentFolderId} IS NULL
        UNION ALL
        SELECT
          ${folder.id},
          (sp.path || '::' || ${folder.name})::text AS path
        FROM ${folder}
        INNER JOIN folder_paths sp ON ${folder.parentFolderId} = sp.id
        WHERE ${folder.userId} = ${userId}
      )
      SELECT id, path FROM folder_paths ORDER BY path
    `,
  );

  return (result as unknown as { rows: Array<{ id: string; path: string }> })
    .rows;
}

/**
 * The user's folder paths keyed by folder id, from the paths-only query.
 * Paths only: flashcard copy loads cards in several parallel chunks and each
 * one builds this map, so it skips full folder rows that no caller reads.
 *
 * @example
 * const path = (await getFolderPathMapForUser(userId)).get(folderId);
 */
export async function getFolderPathMapForUser(
  userId: string,
): Promise<Map<string, string>> {
  const pathRows = await getFolderPathRowsForUser(userId);
  return new Map(pathRows.map((row) => [row.id, row.path]));
}

export async function isFolderAncestorOf(
  userId: string,
  potentialAncestorId: string,
  targetId: string,
  executor: FolderReadExecutor = getDb(),
): Promise<boolean> {
  const rows = await executor.execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT ${folder.parentFolderId} AS id
        FROM ${folder}
        WHERE id = ${targetId} AND ${folder.userId} = ${userId}
        UNION ALL
        SELECT ${folder.parentFolderId}
        FROM ${folder}
        INNER JOIN ancestors a ON ${folder.id} = a.id
        WHERE ${folder.userId} = ${userId} AND ${folder.parentFolderId} IS NOT NULL
      )
      SELECT 1 FROM ancestors WHERE id = ${potentialAncestorId} LIMIT 1
    `,
  );

  return (rows as unknown as { rows: unknown[] }).rows.length > 0;
}
