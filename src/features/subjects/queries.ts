import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { subject } from "@/db/schema";
import type {
  SubjectAncestor,
  SubjectEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";

export async function getSubjectByIdForUser(
  userId: string,
  subjectId: string,
): Promise<SubjectEntity | null> {
  const results = await getDb()
    .select()
    .from(subject)
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getSubjectRecordForUser(
  userId: string,
  subjectId: string,
): Promise<{ id: string; name: string } | null> {
  const results = await getDb()
    .select({ id: subject.id, name: subject.name })
    .from(subject)
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function countTotalSubjectsForUser(
  userId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(subject)
    .where(eq(subject.userId, userId));

  return result[0]?.total ?? 0;
}

export async function countChildSubjectsForUser(
  userId: string,
  parentSubjectId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(subject)
    .where(
      and(
        eq(subject.userId, userId),
        eq(subject.parentSubjectId, parentSubjectId),
      ),
    );

  return result[0]?.total ?? 0;
}

export async function getSubjectTreeRecordForUser(
  userId: string,
  subjectId: string,
): Promise<{
  id: string;
  parentSubjectId: string | null;
  name: string;
} | null> {
  const results = await getDb()
    .select({
      id: subject.id,
      parentSubjectId: subject.parentSubjectId,
      name: subject.name,
    })
    .from(subject)
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getDescendantSubjectIds(
  userId: string,
  subjectId: string,
): Promise<string[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE subject_tree AS (
        SELECT id
        FROM subject
        WHERE id = ${subjectId} AND user_id = ${userId}
        UNION ALL
        SELECT s.id
        FROM subject s
        INNER JOIN subject_tree st ON s.parent_subject_id = st.id
        WHERE s.user_id = ${userId}
      )
      SELECT id FROM subject_tree
    `,
  );

  return (rows as unknown as { rows: Array<{ id: string }> }).rows.map(
    (r) => r.id,
  );
}

/**
 * Returns the owned ancestor chain in deterministic root-first order.
 *
 * @example await getSubjectAncestors(userId, subjectId);
 */
export async function getSubjectAncestors(
  userId: string,
  subjectId: string,
): Promise<SubjectAncestor[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT s.id, s.name, s.parent_subject_id, 0 AS depth
        FROM subject s
        WHERE s.id = ${subjectId} AND s.user_id = ${userId}
        UNION ALL
        SELECT s.id, s.name, s.parent_subject_id, a.depth + 1
        FROM subject s
        INNER JOIN ancestors a ON s.id = a.parent_subject_id
        WHERE s.user_id = ${userId}
      )
      SELECT id, name, depth FROM ancestors
      WHERE id != ${subjectId}
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

export async function getSubjectPathForUser(
  userId: string,
  subjectId: string,
): Promise<string> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, name, parent_subject_id, 0 AS depth
        FROM subject
        WHERE id = ${subjectId} AND user_id = ${userId}
        UNION ALL
        SELECT s.id, s.name, s.parent_subject_id, a.depth + 1
        FROM subject s
        INNER JOIN ancestors a ON s.id = a.parent_subject_id
        WHERE s.user_id = ${userId}
      )
      SELECT name FROM ancestors ORDER BY depth DESC
    `,
  );

  const names = (rows as unknown as { rows: Array<{ name: string }> }).rows.map(
    (r) => r.name,
  );
  return names.join("::");
}

export async function getSubjectDepthForUser(
  userId: string,
  subjectId: string,
): Promise<number | null> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_subject_id, 1 AS depth
        FROM subject
        WHERE id = ${subjectId} AND user_id = ${userId}
        UNION ALL
        SELECT s.id, s.parent_subject_id, a.depth + 1
        FROM subject s
        INNER JOIN ancestors a ON s.id = a.parent_subject_id
        WHERE s.user_id = ${userId}
      )
      SELECT MAX(depth) AS depth FROM ancestors
    `,
  );

  const result = (rows as unknown as { rows: Array<{ depth: number | null }> })
    .rows[0];
  return result?.depth ?? null;
}

/**
 * Returns the number of levels occupied by a subject and its deepest
 * descendant. A leaf has height 1. Used to keep subtree moves within the cap.
 *
 * @example await getSubjectSubtreeHeightForUser(userId, subjectId); // 1
 */
export async function getSubjectSubtreeHeightForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE descendants AS (
        SELECT id, 1 AS depth
        FROM subject
        WHERE id = ${subjectId} AND user_id = ${userId}
        UNION ALL
        SELECT s.id, d.depth + 1
        FROM subject s
        INNER JOIN descendants d ON s.parent_subject_id = d.id
        WHERE s.user_id = ${userId}
      )
      SELECT MAX(depth) AS height FROM descendants
    `,
  );

  const result = (rows as unknown as { rows: Array<{ height: number | null }> })
    .rows[0];
  return result?.height ?? 1;
}

/**
 * Every subject reachable from a root, with its `::`-joined `path`, ordered by
 * path. The recursive CTE only computes ids and paths; the rows themselves
 * come from Drizzle so they keep the camelCase `SubjectEntity` shape and real
 * `Date`s (raw `execute` rows are snake_case with string timestamps).
 *
 * @example
 * const options = await getAllSubjectsWithPathsForUser(userId);
 * options[0]?.path; // "Math::Calculus"
 */
export async function getAllSubjectsWithPathsForUser(
  userId: string,
): Promise<SubjectOption[]> {
  const [pathRows, subjects] = await Promise.all([
    getSubjectPathRowsForUser(userId),
    getDb().select().from(subject).where(eq(subject.userId, userId)),
  ]);
  const subjectsById = new Map(subjects.map((row) => [row.id, row]));

  return pathRows.flatMap(({ id, path }) => {
    const row = subjectsById.get(id);
    return row ? [{ ...row, path }] : [];
  });
}

/**
 * Id and `::`-joined path of every subject reachable from a root, from one
 * recursive query. Use it when only paths are needed, not full subject rows.
 *
 * @example
 * const pathById = new Map((await getSubjectPathRowsForUser(userId)).map((row) => [row.id, row.path]));
 */
export async function getSubjectPathRowsForUser(
  userId: string,
): Promise<Array<{ id: string; path: string }>> {
  const result = await getDb().execute(
    sql`
      WITH RECURSIVE subject_paths AS (
        SELECT
          s.id,
          s.name::text AS path
        FROM subject s
        WHERE s.user_id = ${userId} AND s.parent_subject_id IS NULL
        UNION ALL
        SELECT
          s.id,
          (sp.path || '::' || s.name)::text AS path
        FROM subject s
        INNER JOIN subject_paths sp ON s.parent_subject_id = sp.id
        WHERE s.user_id = ${userId}
      )
      SELECT id, path FROM subject_paths ORDER BY path
    `,
  );

  return (result as unknown as { rows: Array<{ id: string; path: string }> })
    .rows;
}

export async function isSubjectAncestorOf(
  userId: string,
  potentialAncestorId: string,
  targetId: string,
): Promise<boolean> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT parent_subject_id AS id
        FROM subject
        WHERE id = ${targetId} AND user_id = ${userId}
        UNION ALL
        SELECT s.parent_subject_id
        FROM subject s
        INNER JOIN ancestors a ON s.id = a.id
        WHERE s.user_id = ${userId} AND s.parent_subject_id IS NOT NULL
      )
      SELECT 1 FROM ancestors WHERE id = ${potentialAncestorId} LIMIT 1
    `,
  );

  return (rows as unknown as { rows: unknown[] }).rows.length > 0;
}
