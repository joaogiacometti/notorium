const EMPTY_NOTE_PREVIEW = "No content yet";
const MAX_NOTE_PREVIEW_LENGTH = 72;

/**
 * Builds a compact plain-text preview for rich note content.
 *
 * @example
 * getNoteContentPreview("<p>Chapter summary</p>")
 */
export function getNoteContentPreview(content: string | null): string {
  const plainText = decodeBasicEntities(stripMarkup(content ?? ""))
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

function stripMarkup(content: string): string {
  return content.replace(/<[^>]*>/g, " ");
}

function decodeBasicEntities(content: string): string {
  return content
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}
