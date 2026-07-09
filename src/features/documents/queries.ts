import type { DocumentListItem } from "@/features/documents/types";
import {
  getMindmapsBySubjectForUser,
  getRecentMindmapsForUser,
} from "@/features/mindmaps/queries";
import {
  getNotesBySubjectForUser,
  getRecentNotesForUser,
} from "@/features/notes/queries";

/**
 * Merges a subject's notes and mindmaps into one list ordered by recency, used
 * by the unified documents sidebar and the subject documents preview.
 *
 * @example
 * const documents = await getSubjectDocumentsForUser(userId, subjectId);
 */
export async function getSubjectDocumentsForUser(
  userId: string,
  subjectId: string,
): Promise<DocumentListItem[]> {
  const [notes, mindmaps] = await Promise.all([
    getNotesBySubjectForUser(userId, subjectId),
    getMindmapsBySubjectForUser(userId, subjectId),
  ]);

  const items: DocumentListItem[] = [
    ...notes.map((note) => ({
      id: note.id,
      title: note.title,
      updatedAt: note.updatedAt,
      kind: "note" as const,
      subjectId: note.subjectId,
    })),
    ...mindmaps.map((mindmap) => ({
      id: mindmap.id,
      title: mindmap.title,
      updatedAt: mindmap.updatedAt,
      kind: "mindmap" as const,
      subjectId,
    })),
  ];

  return items.sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
}

/**
 * Merges a user's most recently updated notes and mindmaps across every active
 * subject into one recency-ordered list, used by the home dashboard's "recent
 * documents" card. Each source is over-fetched to `limit` so the merge can still
 * surface the true top `limit` regardless of how they interleave.
 *
 * @example
 * const documents = await getRecentDocumentsForUser(userId, 5);
 */
export async function getRecentDocumentsForUser(
  userId: string,
  limit: number,
): Promise<DocumentListItem[]> {
  const [notes, mindmaps] = await Promise.all([
    getRecentNotesForUser(userId, limit),
    getRecentMindmapsForUser(userId, limit),
  ]);

  const items: DocumentListItem[] = [
    ...notes.map((note) => ({ ...note, kind: "note" as const })),
    ...mindmaps.map((mindmap) => ({ ...mindmap, kind: "mindmap" as const })),
  ];

  return items
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, limit);
}
