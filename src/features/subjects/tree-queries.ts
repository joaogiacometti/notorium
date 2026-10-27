import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, note, subject } from "@/db/schema";
import { buildDueAtFilter } from "@/features/flashcard-review/due-filter";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";

/**
 * The user's subjects as a name-sorted tree for the app-shell sidebar, with
 * `::` paths and document/due-card counts rolled up from each subtree.
 *
 * @example
 * const roots = await getSubjectTreeForUser(userId);
 * roots[0]?.children[0]?.path; // "Math::Calculus"
 */
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
 * Direct (non-rolled-up) note counts keyed by subject id. Used
 * to seed {@link getSubjectTreeForUser} before subtree counts are accumulated.
 */
async function getDocumentCountsBySubject(
  userId: string,
): Promise<Map<string, number>> {
  const noteCounts = await getDb()
    .select({ subjectId: note.subjectId, count: count() })
    .from(note)
    .where(eq(note.userId, userId))
    .groupBy(note.subjectId);

  const counts = new Map<string, number>();
  for (const row of noteCounts) {
    counts.set(row.subjectId, (counts.get(row.subjectId) ?? 0) + row.count);
  }
  return counts;
}

/**
 * Direct (non-rolled-up) count of cards due at `now` keyed by subject id. Seeds
 * the sidebar review indicator in {@link getSubjectTreeForUser}; subtree totals
 * are accumulated there. Uses the review queue's due rule so the badge matches
 * what a review session shows. Cards with a null subject (mid-migration) are skipped.
 */
async function getDueFlashcardCountsBySubject(
  userId: string,
  now: Date,
): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({ subjectId: flashcard.subjectId, count: count() })
    .from(flashcard)
    .where(and(eq(flashcard.userId, userId), buildDueAtFilter(now)))
    .groupBy(flashcard.subjectId);

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.subjectId) {
      counts.set(row.subjectId, row.count);
    }
  }
  return counts;
}
