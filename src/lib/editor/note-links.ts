import type { RichTextDocument } from "@/lib/editor/document";

/**
 * Folder-independent link target, so links survive moving the note.
 *
 * @example getNoteLinkHref("n1"); // "/notes/n1"
 */
export function getNoteLinkHref(noteId: string): string {
  return `/notes/${encodeURIComponent(noteId)}`;
}

/**
 * Distinct note ids linked from stored rich text.
 *
 * @example extractNoteLinkIds(document); // ["n1"]
 */
export function extractNoteLinkIds(value: RichTextDocument): string[] {
  const ids = new Set<string>();
  const visit = (node: import("@tiptap/core").JSONContent) => {
    if (node.type === "noteLink" && typeof node.attrs?.noteId === "string")
      ids.add(node.attrs.noteId);
    node.content?.forEach(visit);
  };
  value.content.forEach(visit);
  return [...ids];
}
