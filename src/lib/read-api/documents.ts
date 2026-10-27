import type { DocumentListItem } from "@/features/documents/types";
import {
  fetchReadApi,
  fetchReadApiOrNull,
} from "@/lib/read-api/read-api-client";
import type { NoteEntity } from "@/lib/server/api-contracts";

/**
 * Load one subject's notes for the tree sidebar.
 *
 * @example
 * const documents = await fetchSubjectDocuments(subjectId);
 */
export function fetchSubjectDocuments(
  subjectId: string,
): Promise<DocumentListItem[]> {
  return fetchReadApi<DocumentListItem[]>(
    `/api/subjects/${encodeURIComponent(subjectId)}/documents`,
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
