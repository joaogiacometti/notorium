import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, folder, note, pdfDocument } from "@/db/schema";
import { buildDueAtFilter } from "@/features/flashcard-review/due-filter";
import type { FolderTreeNode } from "@/lib/server/api-contracts";

/**
 * The user's folders as a name-sorted tree for the app-shell sidebar, with
 * `::` paths and document/due-card counts rolled up from each subtree.
 *
 * @example
 * const roots = await getFolderTreeForUser(userId);
 * roots[0]?.children[0]?.path; // "Math::Calculus"
 */
export async function getFolderTreeForUser(
  userId: string,
): Promise<FolderTreeNode[]> {
  const allFolders = await getDb()
    .select()
    .from(folder)
    .where(eq(folder.userId, userId))
    .orderBy(folder.name);

  const [documentCounts, dueFlashcardCounts] = await Promise.all([
    getDocumentCountsByFolder(userId),
    getDueFlashcardCountsByFolder(userId, new Date()),
  ]);

  const nodeMap = new Map<string, FolderTreeNode>();

  for (const s of allFolders) {
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
    if (!node.parentFolderId) {
      return node.name;
    }
    const parentPath = buildPath(node.parentFolderId);
    return parentPath ? `${parentPath}::${node.name}` : node.name;
  }

  const roots: FolderTreeNode[] = [];

  for (const node of nodeMap.values()) {
    node.path = buildPath(node.id);
    if (node.parentFolderId) {
      const parent = nodeMap.get(node.parentFolderId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // Roll up document and due-card counts so a collapsed parent reflects its
  // whole subtree (e.g. the sidebar review badge counts descendant cards too).
  function applySubtreeCounts(node: FolderTreeNode): {
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
 * Direct (non-rolled-up) note and PDF counts keyed by folder id. Used
 * to seed {@link getFolderTreeForUser} before subtree counts are accumulated.
 */
async function getDocumentCountsByFolder(
  userId: string,
): Promise<Map<string, number>> {
  const [noteCounts, pdfCounts] = await Promise.all([
    getDb()
      .select({ folderId: note.folderId, count: count() })
      .from(note)
      .where(eq(note.userId, userId))
      .groupBy(note.folderId),
    getDb()
      .select({ folderId: pdfDocument.folderId, count: count() })
      .from(pdfDocument)
      .where(eq(pdfDocument.userId, userId))
      .groupBy(pdfDocument.folderId),
  ]);

  const counts = new Map<string, number>();
  for (const row of [...noteCounts, ...pdfCounts]) {
    counts.set(row.folderId, (counts.get(row.folderId) ?? 0) + row.count);
  }
  return counts;
}

/**
 * Direct (non-rolled-up) count of cards due at `now` keyed by folder id. Seeds
 * the sidebar review indicator in {@link getFolderTreeForUser}; subtree totals
 * are accumulated there. Uses the review queue's due rule so the badge matches
 * what a review session shows. Cards with a null folder (mid-migration) are skipped.
 */
async function getDueFlashcardCountsByFolder(
  userId: string,
  now: Date,
): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({ folderId: flashcard.folderId, count: count() })
    .from(flashcard)
    .where(and(eq(flashcard.userId, userId), buildDueAtFilter(now)))
    .groupBy(flashcard.folderId);

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.folderId) {
      counts.set(row.folderId, row.count);
    }
  }
  return counts;
}
