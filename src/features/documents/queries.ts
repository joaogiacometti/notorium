import type {
  DocumentKind,
  DocumentListItem,
} from "@/features/documents/types";
import {
  getNotesBySubjectForUser,
  getRecentNotesForUser,
} from "@/features/notes/queries";
import {
  getPdfsBySubjectForUser,
  getRecentPdfsForUser,
} from "@/features/pdfs/queries";

type DocumentListRow = Omit<DocumentListItem, "kind">;

function toDocumentListItems(
  rows: DocumentListRow[],
  kind: DocumentKind,
): DocumentListItem[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    kind,
    subjectId: row.subjectId,
  }));
}

function sortByMostRecent(items: DocumentListItem[]): DocumentListItem[] {
  return items.sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
}

/**
 * Lists a subject's notes and PDFs ordered by recency, used
 * by the unified documents sidebar and the subject documents preview.
 *
 * @example
 * const documents = await getSubjectDocumentsForUser(userId, subjectId);
 */
export async function getSubjectDocumentsForUser(
  userId: string,
  subjectId: string,
): Promise<DocumentListItem[]> {
  const [notes, pdfs] = await Promise.all([
    getNotesBySubjectForUser(userId, subjectId),
    getPdfsBySubjectForUser(userId, subjectId),
  ]);

  return sortByMostRecent([
    ...toDocumentListItems(notes, "note"),
    ...toDocumentListItems(pdfs, "pdf"),
  ]);
}

/**
 * Lists a user's most recently updated notes and PDFs across active subjects
 * for the home dashboard's "recent documents" card.
 *
 * @example
 * const documents = await getRecentDocumentsForUser(userId, 5);
 */
export async function getRecentDocumentsForUser(
  userId: string,
  limit: number,
): Promise<DocumentListItem[]> {
  const [notes, pdfs] = await Promise.all([
    getRecentNotesForUser(userId, limit),
    getRecentPdfsForUser(userId, limit),
  ]);

  return sortByMostRecent([
    ...toDocumentListItems(notes, "note"),
    ...toDocumentListItems(pdfs, "pdf"),
  ]).slice(0, limit);
}
