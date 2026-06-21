/**
 * Pure helpers that read the active subject/document from a pathname so the
 * subject tree can highlight the current location and reveal its rows. Kept
 * apart from the sidebar component so they stay easy to unit test.
 */

/**
 * Extracts the active subject id from a `/subjects/[id]/...` pathname.
 *
 * @example getActiveSubjectId("/subjects/s1/documents/notes/n1") // "s1"
 */
export function getActiveSubjectId(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "subjects") {
    return undefined;
  }
  const candidate = segments[1];
  if (!candidate) {
    return undefined;
  }
  return candidate;
}

/**
 * Subject id whose document rows must be revealed because a document under it is
 * open. Matches `/subjects/[id]/documents/(notes|mindmaps|books)/[docId]`, so the
 * tree can expand that subject and load its documents on first paint.
 *
 * @example getActiveDocumentSubjectId("/subjects/s1/documents/books/b1") // "s1"
 */
export function getActiveDocumentSubjectId(
  pathname: string,
): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "subjects" || segments[2] !== "documents") {
    return undefined;
  }
  if (
    segments[3] !== "notes" &&
    segments[3] !== "mindmaps" &&
    segments[3] !== "books"
  ) {
    return undefined;
  }
  return segments[1];
}
