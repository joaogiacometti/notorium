import type { DocumentListItem } from "@/features/documents/types";
import {
  getNotesBySubjectForUser,
  getRecentNotesForUser,
} from "@/features/notes/queries";

/**
 * Lists a subject's notes ordered by recency, used
 * by the unified documents sidebar and the subject documents preview.
 *
 * @example
 * const documents = await getSubjectDocumentsForUser(userId, subjectId);
 */
export async function getSubjectDocumentsForUser(
  userId: string,
  subjectId: string,
): Promise<DocumentListItem[]> {
  const notes = await getNotesBySubjectForUser(userId, subjectId);

  const items: DocumentListItem[] = [
    ...notes.map((note) => ({
      id: note.id,
      title: note.title,
      updatedAt: note.updatedAt,
      kind: "note" as const,
      subjectId: note.subjectId,
    })),
  ];

  return items.sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
}

/**
 * Lists a user's most recently updated notes across active subjects for the
 * home dashboard's "recent documents" card.
 *
 * @example
 * const documents = await getRecentDocumentsForUser(userId, 5);
 */
export async function getRecentDocumentsForUser(
  userId: string,
  limit: number,
): Promise<DocumentListItem[]> {
  const notes = await getRecentNotesForUser(userId, limit);

  const items: DocumentListItem[] = [
    ...notes.map((note) => ({ ...note, kind: "note" as const })),
  ];

  return items
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, limit);
}
