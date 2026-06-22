import { and, count, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, libraryBook, mindmap, note, subject } from "@/db/schema";
import type {
  SubjectEntity,
  SubjectListItem,
  SubjectOption,
  SubjectTreeNode,
} from "@/lib/server/api-contracts";

export async function getSubjectsForUser(
  userId: string,
): Promise<SubjectEntity[]> {
  return getDb()
    .select()
    .from(subject)
    .where(eq(subject.userId, userId))
    .orderBy(desc(subject.updatedAt));
}

export async function getAcademicSubjectsForUser(
  userId: string,
): Promise<SubjectEntity[]> {
  return getDb()
    .select()
    .from(subject)
    .where(and(eq(subject.userId, userId), eq(subject.kind, "academic")))
    .orderBy(desc(subject.updatedAt));
}

export async function getAcademicSubjectRecordForUser(
  userId: string,
  subjectId: string,
): Promise<{ id: string } | null> {
  const results = await getDb()
    .select({ id: subject.id })
    .from(subject)
    .where(
      and(
        eq(subject.id, subjectId),
        eq(subject.userId, userId),
        eq(subject.kind, "academic"),
      ),
    )
    .limit(1);

  return results[0] ?? null;
}

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

export async function getAllSubjectsForUser(
  userId: string,
): Promise<SubjectEntity[]> {
  return getDb()
    .select()
    .from(subject)
    .where(eq(subject.userId, userId))
    .orderBy(desc(subject.updatedAt));
}

export async function getSubjectListItemsForUser(
  userId: string,
): Promise<SubjectListItem[]> {
  const subjects = await getAllSubjectsForUser(userId);

  if (subjects.length === 0) {
    return [];
  }

  const noteCounts = await getDb()
    .select({ subjectId: note.subjectId, count: count() })
    .from(note)
    .where(eq(note.userId, userId))
    .groupBy(note.subjectId)
    .then((rows) => new Map(rows.map((row) => [row.subjectId, row.count])));

  return subjects.map((currentSubject) => ({
    ...currentSubject,
    notesCount: noteCounts.get(currentSubject.id) ?? 0,
  }));
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

export async function getSubjectRecordsForUser(
  userId: string,
  subjectIds: string[],
): Promise<Array<{ id: string }>> {
  if (subjectIds.length === 0) return [];

  return getDb()
    .select({ id: subject.id })
    .from(subject)
    .where(and(inArray(subject.id, subjectIds), eq(subject.userId, userId)));
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

export async function getSubjectAncestors(
  userId: string,
  subjectId: string,
): Promise<SubjectEntity[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE ancestors AS (
        SELECT s.*
        FROM subject s
        WHERE s.id = ${subjectId} AND s.user_id = ${userId}
        UNION ALL
        SELECT s.*
        FROM subject s
        INNER JOIN ancestors a ON s.id = a.parent_subject_id
        WHERE s.user_id = ${userId}
      )
      SELECT * FROM ancestors
      WHERE id != ${subjectId}
      ORDER BY (
        SELECT count(*) FROM (
          WITH RECURSIVE depth AS (
            SELECT id, parent_subject_id, 0 AS lvl
            FROM subject WHERE id = ${subjectId}
            UNION ALL
            SELECT s.id, s.parent_subject_id, depth.lvl + 1
            FROM subject s INNER JOIN depth ON s.id = depth.parent_subject_id
          )
          SELECT * FROM depth
        ) sub WHERE sub.id = ancestors.id
      ) DESC
    `,
  );

  return (rows as unknown as { rows: SubjectEntity[] }).rows;
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

export async function getAllSubjectsWithPathsForUser(
  userId: string,
): Promise<SubjectOption[]> {
  const rows = await getDb().execute(
    sql`
      WITH RECURSIVE subject_paths AS (
        SELECT
          s.*,
          s.name::text AS path
        FROM subject s
        WHERE s.user_id = ${userId} AND s.parent_subject_id IS NULL
        UNION ALL
        SELECT
          s.*,
          (sp.path || '::' || s.name)::text AS path
        FROM subject s
        INNER JOIN subject_paths sp ON s.parent_subject_id = sp.id
        WHERE s.user_id = ${userId}
      )
      SELECT * FROM subject_paths ORDER BY path
    `,
  );

  return (rows as unknown as { rows: SubjectOption[] }).rows;
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

export async function getSubjectTreeForUser(
  userId: string,
): Promise<SubjectTreeNode[]> {
  const allSubjects = await getDb()
    .select()
    .from(subject)
    .where(eq(subject.userId, userId))
    .orderBy(subject.name);

  const [documentCounts, dueFlashcardCounts] = await Promise.all([
    getDocumentCountsBySubject(userId),
    getDueFlashcardCountsBySubject(userId, new Date()),
  ]);

  const nodeMap = new Map<string, SubjectTreeNode>();

  for (const s of allSubjects) {
    nodeMap.set(s.id, {
      ...s,
      documentCount: documentCounts.get(s.id) ?? 0,
      dueFlashcardCount: dueFlashcardCounts.get(s.id) ?? 0,
      children: [],
      path: "",
    });
  }

  function buildPath(nodeId: string): string {
    const node = nodeMap.get(nodeId);
    if (!node) {
      return "";
    }
    if (!node.parentSubjectId) {
      return node.name;
    }
    const parentPath = buildPath(node.parentSubjectId);
    return parentPath ? `${parentPath}::${node.name}` : node.name;
  }

  const roots: SubjectTreeNode[] = [];

  for (const node of nodeMap.values()) {
    node.path = buildPath(node.id);
    if (node.parentSubjectId) {
      const parent = nodeMap.get(node.parentSubjectId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // Roll up document and due-card counts so a collapsed parent reflects its
  // whole subtree (e.g. the sidebar review badge counts descendant cards too).
  function applySubtreeCounts(node: SubjectTreeNode): {
    documents: number;
    due: number;
  } {
    for (const childNode of node.children) {
      const childTotals = applySubtreeCounts(childNode);
      node.documentCount += childTotals.documents;
      node.dueFlashcardCount += childTotals.due;
    }
    return { documents: node.documentCount, due: node.dueFlashcardCount };
  }

  for (const rootNode of roots) {
    applySubtreeCounts(rootNode);
  }

  return roots;
}

/**
 * Direct (non-rolled-up) note + mindmap + book counts keyed by subject id. Used
 * to seed {@link getSubjectTreeForUser} before subtree counts are accumulated.
 * Books with a null subject (mid-migration) are skipped.
 */
async function getDocumentCountsBySubject(
  userId: string,
): Promise<Map<string, number>> {
  const [noteCounts, mindmapCounts, bookCounts] = await Promise.all([
    getDb()
      .select({ subjectId: note.subjectId, count: count() })
      .from(note)
      .where(eq(note.userId, userId))
      .groupBy(note.subjectId),
    getDb()
      .select({ subjectId: mindmap.subjectId, count: count() })
      .from(mindmap)
      .where(eq(mindmap.userId, userId))
      .groupBy(mindmap.subjectId),
    getDb()
      .select({ subjectId: libraryBook.subjectId, count: count() })
      .from(libraryBook)
      .where(eq(libraryBook.userId, userId))
      .groupBy(libraryBook.subjectId),
  ]);

  const counts = new Map<string, number>();
  for (const row of [...noteCounts, ...mindmapCounts, ...bookCounts]) {
    if (!row.subjectId) continue;
    counts.set(row.subjectId, (counts.get(row.subjectId) ?? 0) + row.count);
  }
  return counts;
}

/**
 * Direct (non-rolled-up) count of cards due at `now` keyed by subject id. Seeds
 * the sidebar review indicator in {@link getSubjectTreeForUser}; subtree totals
 * are accumulated there. Cards with a null subject (mid-migration) are skipped.
 */
async function getDueFlashcardCountsBySubject(
  userId: string,
  now: Date,
): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({ subjectId: flashcard.subjectId, count: count() })
    .from(flashcard)
    .where(and(eq(flashcard.userId, userId), lte(flashcard.dueAt, now)))
    .groupBy(flashcard.subjectId);

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.subjectId) {
      counts.set(row.subjectId, row.count);
    }
  }
  return counts;
}
