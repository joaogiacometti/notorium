import type { PdfCrop } from "@/components/pdfs/pdf-page-layout";

/** Horizontal extent of a page's text, in viewport units at scale 1. */
export interface TextColumn {
  left: number;
  right: number;
}

/** The part of a pdf.js viewport needed to place text on the page. */
export interface PdfCropViewport {
  width: number;
  transform: number[];
}

/** The slice of a pdf.js document that crop measuring reads. */
export interface PdfCropSource {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getViewport(params: { scale: number }): PdfCropViewport;
    getTextContent(): Promise<{ items: ReadonlyArray<object> }>;
  }>;
}

interface PositionedTextItem {
  str: string;
  width: number;
  transform: number[];
}

// Slack kept beside the text so glyph overhangs and italics are not clipped.
const CROP_PADDING_FRACTION = 0.03;
// Trimming less than this gains nothing visible.
const MIN_TRIMMED_FRACTION = 0.05;
// Keeping less than this suggests a stray measurement, not a text column.
const MIN_KEPT_FRACTION = 0.5;

/**
 * Measure the text crop from the opening page, its facing page (so inner and
 * outer book margins both fit), and the middle page, so opening on a cover
 * or title page still fits the body text.
 * @example await measurePdfTextCrop(pdfDocument, 12); // { left: 0.12, width: 0.76 }
 */
export async function measurePdfTextCrop(
  pdfDocument: PdfCropSource,
  pageNumber: number,
): Promise<PdfCrop | null> {
  const pages = await Promise.all(
    cropSamplePages(pageNumber, pdfDocument.numPages).map((page) =>
      pdfDocument.getPage(page),
    ),
  );
  const viewport = pages[0].getViewport({ scale: 1 });
  const columns = await Promise.all(
    pages.map(async (page) =>
      measureTextColumn(
        (await page.getTextContent()).items,
        page.getViewport({ scale: 1 }),
      ),
    ),
  );
  return resolvePdfCrop(columns, viewport.width);
}

/**
 * The union of a page's text extents, ignoring bare page numbers that often
 * sit in the outer margin. Null when the page has no text layer.
 * @example measureTextColumn(items, page.getViewport({ scale: 1 }));
 */
export function measureTextColumn(
  items: ReadonlyArray<object>,
  viewport: PdfCropViewport,
): TextColumn | null {
  const edges = items.filter(isColumnTextItem).flatMap((item) => {
    const [, , , , x, y] = item.transform;
    return [
      toViewportX(viewport, x, y),
      toViewportX(viewport, x + item.width, y),
    ];
  });
  if (edges.length === 0) return null;
  return { left: Math.min(...edges), right: Math.max(...edges) };
}

/**
 * Combine measured columns into one crop for every page, or null when there
 * is no text or the crop would not help.
 * @example resolvePdfCrop([{ left: 72, right: 540 }], 612);
 */
export function resolvePdfCrop(
  columns: ReadonlyArray<TextColumn | null>,
  pageWidth: number,
): PdfCrop | null {
  const measured = columns.filter((column) => column !== null);
  if (measured.length === 0 || pageWidth <= 0) return null;
  const padding = pageWidth * CROP_PADDING_FRACTION;
  const left = Math.max(
    0,
    Math.min(...measured.map((column) => column.left)) - padding,
  );
  const right = Math.min(
    pageWidth,
    Math.max(...measured.map((column) => column.right)) + padding,
  );
  const width = (right - left) / pageWidth;
  if (width > 1 - MIN_TRIMMED_FRACTION || width < MIN_KEPT_FRACTION)
    return null;
  return { left: left / pageWidth, width };
}

// The facing page is the next one, or the previous one on the last page.
function cropSamplePages(pageNumber: number, pageCount: number): number[] {
  const neighbor = pageNumber < pageCount ? pageNumber + 1 : pageNumber - 1;
  const middle = Math.ceil(pageCount / 2);
  return [...new Set([pageNumber, neighbor, middle])].filter(
    (page) => page >= 1,
  );
}

function isColumnTextItem(item: object): item is PositionedTextItem {
  if (!("str" in item) || typeof item.str !== "string") return false;
  if (!("width" in item) || typeof item.width !== "number") return false;
  if (!("transform" in item) || !Array.isArray(item.transform)) return false;
  const text = item.str.trim();
  return text !== "" && item.width > 0 && !/^\d+$/.test(text);
}

// The x part of applying the viewport's affine matrix to a PDF-space point.
function toViewportX(viewport: PdfCropViewport, x: number, y: number): number {
  const [a, , c, , e] = viewport.transform;
  return a * x + c * y + e;
}
