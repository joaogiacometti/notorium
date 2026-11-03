import { documentText, type RichTextDocument } from "@/lib/editor/document";

const EMPTY_NOTE_PREVIEW = "No content yet";
const MAX_NOTE_PREVIEW_LENGTH = 72;

/**
 * Builds a compact plain-text preview for rich note content.
 *
 * @example
 * getNoteContentPreview(document)
 */
export function getNoteContentPreview(
  content: RichTextDocument | null,
): string {
  const plainText = (content ? documentText(content) : "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    return EMPTY_NOTE_PREVIEW;
  }

  if (plainText.length <= MAX_NOTE_PREVIEW_LENGTH) {
    return plainText;
  }

  return `${plainText.slice(0, MAX_NOTE_PREVIEW_LENGTH - 3).trimEnd()}...`;
}
