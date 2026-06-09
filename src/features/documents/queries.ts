import type { DocumentListItem } from "@/features/documents/types";
import { getMindmapsBySubjectForUser } from "@/features/mindmaps/queries";
import { getNotesBySubjectForUser } from "@/features/notes/queries";

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
