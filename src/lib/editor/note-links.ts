const NOTE_ID_ATTRIBUTE = "data-note-id";

/**
 * Exact attribute text a saved link to `noteId` contains. User-typed text cannot
 * match it because the editor escapes quotes in stored HTML.
 *
 * @example getNoteLinkMarker("n1"); // data-note-id="n1"
 */
export function getNoteLinkMarker(noteId: string): string {
  return `${NOTE_ID_ATTRIBUTE}="${noteId}"`;
}

/**
 * Subject-independent link target, so links survive moving the note.
 *
 * @example getNoteLinkHref("n1"); // "/notes/n1"
 */
export function getNoteLinkHref(noteId: string): string {
  return `/notes/${encodeURIComponent(noteId)}`;
}

/**
 * Distinct note ids linked from stored rich text.
 *
 * @example extractNoteLinkIds(storedNoteHtml); // ["n1"]
 */
export function extractNoteLinkIds(html: string): string[] {
  const matches = html.matchAll(/data-note-id="([^"]+)"/g);
  return [...new Set(Array.from(matches, (match) => match[1]))];
}
