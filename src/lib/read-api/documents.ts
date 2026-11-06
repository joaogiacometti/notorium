import type { DocumentListItem } from "@/features/documents/types";
import {
  fetchReadApi,
  fetchReadApiOrNull,
} from "@/lib/read-api/read-api-client";
import type { NoteConnections, NoteEntity } from "@/lib/server/api-contracts";

/**
 * Load the links in and out of a note, or `null` when it no longer exists.
 *
 * @example
 * const connections = await fetchNoteConnections(noteId);
 */
export function fetchNoteConnections(
  noteId: string,
): Promise<NoteConnections | null> {
  return fetchReadApiOrNull<NoteConnections>(
    `/api/notes/${encodeURIComponent(noteId)}/connections`,
  );
}

/**
 * Load one folder's notes for the tree sidebar.
 *
 * @example
 * const documents = await fetchFolderDocuments(folderId);
 */
export function fetchFolderDocuments(
  folderId: string,
): Promise<DocumentListItem[]> {
  return fetchReadApi<DocumentListItem[]>(
    `/api/folders/${encodeURIComponent(folderId)}/documents`,
  );
}

/**
 * Load a note's last saved version, or `null` when it no longer exists.
 *
 * @example
 * const note = await fetchNoteById(noteId);
 */
export function fetchNoteById(noteId: string): Promise<NoteEntity | null> {
  return fetchReadApiOrNull<NoteEntity>(
    `/api/notes/${encodeURIComponent(noteId)}`,
  );
}
