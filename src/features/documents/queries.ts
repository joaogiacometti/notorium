import type {
  DocumentKind,
  DocumentListItem,
} from "@/features/documents/types";
import {
  getNotesByFolderForUser,
  getRecentNotesForUser,
} from "@/features/notes/queries";
import {
  getPdfsByFolderForUser,
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
    folderId: row.folderId,
  }));
}

function sortByMostRecent(items: DocumentListItem[]): DocumentListItem[] {
  return items.sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );
}

/**
 * Lists a folder's notes and PDFs ordered by recency, used
 * by the unified documents sidebar and the folder documents preview.
 *
 * @example
 * const documents = await getFolderDocumentsForUser(userId, folderId);
 */
export async function getFolderDocumentsForUser(
  userId: string,
  folderId: string,
): Promise<DocumentListItem[]> {
  const [notes, pdfs] = await Promise.all([
    getNotesByFolderForUser(userId, folderId),
    getPdfsByFolderForUser(userId, folderId),
  ]);

  return sortByMostRecent([
    ...toDocumentListItems(notes, "note"),
    ...toDocumentListItems(pdfs, "pdf"),
  ]);
}

/**
 * Lists a user's most recently updated notes and PDFs across active folders
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
