/** The part of a pdf.js text item the reader needs; marked-content items lack `str`. */
interface PdfTextFragment {
  str: string;
  hasEOL: boolean;
}

/**
 * Join a page's pdf.js text items into readable text.
 * @example joinPdfTextItems((await page.getTextContent()).items);
 */
export function joinPdfTextItems(items: ReadonlyArray<object>): string {
  const text = items
    .filter(isPdfTextFragment)
    .map((item) => (item.hasEOL ? `${item.str}\n` : item.str))
    .join("");
  return normalizePdfText(text);
}

/**
 * Undo common extraction artifacts: ligature glyphs, words hyphenated across
 * line breaks, and runs of spaces or blank lines.
 * @example normalizePdfText("photo-\nsynthesis") // "photosynthesis"
 */
export function normalizePdfText(text: string): string {
  return (
    text
      // Only ligatures: full NFKC would also flatten superscripts in math.
      .replace(/[ﬀ-ﬆ]/g, (ligature) => ligature.normalize("NFKC"))
      .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
      .replace(/[^\S\n]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function isPdfTextFragment(item: object): item is PdfTextFragment {
  return "str" in item && typeof item.str === "string";
}
