import {
  PDF_NO_CROP,
  type PdfCrop,
  type PdfRows,
} from "@/components/pdfs/pdf-page-layout";

/** The part of a pdf.js viewport needed to place text on the page. */
export interface PdfCropViewport {
  width: number;
  height: number;
  transform: number[];
}

/** The slice of a pdf.js page that crop measuring reads. */
export interface PdfCropPage {
  getViewport(params: { scale: number }): PdfCropViewport;
  getTextContent(): Promise<{ items: ReadonlyArray<object> }>;
}

/** The slice of a pdf.js document that crop measuring reads. */
export interface PdfCropSource {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfCropPage>;
}

/** One line of page text, in viewport units at scale 1. */
interface TextLine {
  left: number;
  right: number;
  top: number;
  baseline: number;
  fontHeight: number;
}

/** A page's size and its text lines from top to bottom. */
export interface PageText {
  width: number;
  height: number;
  lines: TextLine[];
}

/** The crop shared by every page, and where the running head sits. */
export interface PdfTextCrop {
  crop: PdfCrop;
  /** Baseline of the header repeated on every page, in viewport units. */
  runningHead: number | null;
}

interface PositionedTextItem {
  str: string;
  width: number;
  transform: number[];
}

// Slack kept around the text so glyph overhangs, italics, and descenders are
// not clipped.
const COLUMN_PADDING_FRACTION = 0.03;
const ROWS_PADDING_FRACTION = 0.015;
// Trimming less than this gains nothing visible.
const MIN_TRIMMED_FRACTION = 0.05;
// Keeping less than this suggests a stray measurement, not a text block.
const MIN_KEPT_FRACTION = 0.5;
const ROWS_EPSILON = 1e-6;
// A running head sits near the top edge, apart from the body, in body-sized
// or smaller type, at the same height on more than one page.
const RUNNING_HEAD_ZONE_FRACTION = 0.15;
const RUNNING_HEAD_GAP_PITCHES = 1.5;
const RUNNING_HEAD_MAX_FONT_RATIO = 1.15;
const RUNNING_HEAD_TOLERANCE = 2;

/**
 * Measure the text crop from the opening page, its facing page (so inner and
 * outer book margins both fit), and the middle page, so opening on a cover
 * or title page still fits the body text.
 * @example await measurePdfTextCrop(pdfDocument, 12); // { crop: { left: 0.12, width: 0.76, top: 0.1, height: 0.8 }, runningHead: 40 }
 */
export async function measurePdfTextCrop(
  pdfDocument: PdfCropSource,
  pageNumber: number,
): Promise<PdfTextCrop | null> {
  const pages = await Promise.all(
    cropSamplePages(pageNumber, pdfDocument.numPages).map(async (page) =>
      readPageText(await pdfDocument.getPage(page)),
    ),
  );
  return resolvePdfTextCrop(pages);
}

/**
 * The rows of one loaded page: the shared rows, widened to any text of its
 * own outside them. A page without text, such as a full-page figure, is not
 * trimmed vertically.
 * @example await measurePdfPageRows(page, textCrop); // { top: 0.1, height: 0.8 }
 */
export async function measurePdfPageRows(
  page: PdfCropPage,
  textCrop: PdfTextCrop,
): Promise<PdfRows> {
  return resolvePageRows(textCrop, await readPageText(page));
}

async function readPageText(page: PdfCropPage): Promise<PageText> {
  return measurePageText(
    (await page.getTextContent()).items,
    page.getViewport({ scale: 1 }),
  );
}

/**
 * A page's text grouped into lines, ignoring bare page numbers that often sit
 * alone in a margin.
 * @example measurePageText(items, page.getViewport({ scale: 1 }));
 */
export function measurePageText(
  items: ReadonlyArray<object>,
  viewport: PdfCropViewport,
): PageText {
  const boxes = items
    .filter(isBodyTextItem)
    .map((item) => textItemBox(item, viewport))
    .sort((first, second) => first.baseline - second.baseline);
  const lines: TextLine[] = [];
  for (const box of boxes) {
    const line = lines.at(-1);
    // Raised marks such as footnote references belong to the line below them.
    if (line && box.baseline - line.baseline <= box.fontHeight / 2) {
      line.left = Math.min(line.left, box.left);
      line.right = Math.max(line.right, box.right);
      line.top = Math.min(line.top, box.top);
      line.baseline = box.baseline;
      line.fontHeight = Math.max(line.fontHeight, box.fontHeight);
    } else {
      lines.push(box);
    }
  }
  return { width: viewport.width, height: viewport.height, lines };
}

/**
 * Combine measured pages into one crop for every page, or null when there is
 * no text or trimming would not help. The first page gives the page size.
 * @example resolvePdfTextCrop([openingPage, facingPage, middlePage]);
 */
export function resolvePdfTextCrop(
  pages: ReadonlyArray<PageText>,
): PdfTextCrop | null {
  const [{ width, height }] = pages;
  const runningHead = findRunningHead(pages);
  const lines = pages.flatMap((page) => page.lines);
  const body = pages.flatMap((page) => bodyLines(page, runningHead));
  if (body.length === 0 || width <= 0 || height <= 0) return null;
  const columns = resolveSpan(
    Math.min(...lines.map((line) => line.left)),
    Math.max(...lines.map((line) => line.right)),
    width,
    COLUMN_PADDING_FRACTION,
  );
  const rows = resolveSpan(
    Math.min(...body.map((line) => line.top)),
    Math.max(...body.map((line) => line.baseline)),
    height,
    ROWS_PADDING_FRACTION,
  );
  if (!columns && !rows) return null;
  return {
    crop: {
      left: columns?.start ?? PDF_NO_CROP.left,
      width: columns?.size ?? PDF_NO_CROP.width,
      top: rows?.start ?? PDF_NO_CROP.top,
      height: rows?.size ?? PDF_NO_CROP.height,
    },
    runningHead,
  };
}

/**
 * The rows to show of one page: the shared rows, widened so none of the
 * page's own body text is cut, or the whole page when it has no text.
 * @example resolvePageRows(textCrop, measurePageText(items, viewport));
 */
export function resolvePageRows(
  { crop, runningHead }: PdfTextCrop,
  page: PageText,
): PdfRows {
  if (page.lines.length === 0 || page.height <= 0) return PDF_NO_CROP;
  const body = bodyLines(page, runningHead);
  if (body.length === 0) return { top: crop.top, height: crop.height };
  const textTop =
    Math.min(...body.map((line) => line.top)) / page.height -
    ROWS_PADDING_FRACTION;
  const textBottom =
    Math.max(...body.map((line) => line.baseline)) / page.height +
    ROWS_PADDING_FRACTION;
  const sharedBottom = crop.top + crop.height;
  // Text on the shared edge, give or take rounding, keeps the shared rows
  // exactly, so the page does not count as a different shape.
  const top =
    textTop < crop.top - ROWS_EPSILON ? Math.max(0, textTop) : crop.top;
  const bottom =
    textBottom > sharedBottom + ROWS_EPSILON
      ? Math.min(1, textBottom)
      : sharedBottom;
  const shared = top === crop.top && bottom === sharedBottom;
  return { top, height: shared ? crop.height : bottom - top };
}

/** A padded span as fractions of a page side, or null when not worth trimming. */
function resolveSpan(
  start: number,
  end: number,
  side: number,
  paddingFraction: number,
): { start: number; size: number } | null {
  const padding = side * paddingFraction;
  const from = Math.max(0, start - padding);
  const size = (Math.min(side, end + padding) - from) / side;
  if (size > 1 - MIN_TRIMMED_FRACTION || size < MIN_KEPT_FRACTION) return null;
  return { start: from / side, size };
}

// The baseline shared by the top line of at least two pages that each look
// like a running head. One page alone could be a heading that opens the page.
function findRunningHead(pages: ReadonlyArray<PageText>): number | null {
  const candidates = pages
    .map(runningHeadCandidate)
    .filter((baseline) => baseline !== null);
  return (
    candidates.find(
      (baseline, index) =>
        candidates.findIndex(
          (other) => Math.abs(other - baseline) <= RUNNING_HEAD_TOLERANCE,
        ) !== index,
    ) ?? null
  );
}

function runningHeadCandidate({ lines, height }: PageText): number | null {
  if (lines.length < 3) return null;
  const [first, second] = lines;
  const pitch = median(
    lines.slice(1).map((line, index) => line.baseline - lines[index].baseline),
  );
  const bodyFont = median(lines.map((line) => line.fontHeight));
  const isRunningHead =
    first.baseline <= height * RUNNING_HEAD_ZONE_FRACTION &&
    second.baseline - first.baseline >= pitch * RUNNING_HEAD_GAP_PITCHES &&
    first.fontHeight <= bodyFont * RUNNING_HEAD_MAX_FONT_RATIO;
  return isRunningHead ? first.baseline : null;
}

function bodyLines(page: PageText, runningHead: number | null): TextLine[] {
  if (runningHead === null) return page.lines;
  return page.lines.filter(
    (line) => Math.abs(line.baseline - runningHead) > RUNNING_HEAD_TOLERANCE,
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)];
}

// The facing page is the next one, or the previous one on the last page.
function cropSamplePages(pageNumber: number, pageCount: number): number[] {
  const neighbor = pageNumber < pageCount ? pageNumber + 1 : pageNumber - 1;
  const middle = Math.ceil(pageCount / 2);
  return [...new Set([pageNumber, neighbor, middle])].filter(
    (page) => page >= 1,
  );
}

function isBodyTextItem(item: object): item is PositionedTextItem {
  if (!("str" in item) || typeof item.str !== "string") return false;
  if (!("width" in item) || typeof item.width !== "number") return false;
  if (!("transform" in item) || !Array.isArray(item.transform)) return false;
  const text = item.str.trim();
  return text !== "" && item.width > 0 && !/^\d+$/.test(text);
}

// The item's box from its baseline start to the far corner one font height
// up, placed with the viewport's affine matrix.
function textItemBox(
  item: PositionedTextItem,
  viewport: PdfCropViewport,
): TextLine {
  const [, , skew, scale, x, y] = item.transform;
  const fontHeight = Math.hypot(skew, scale);
  const [a, b, c, d, e, f] = viewport.transform;
  const xs = [
    a * x + c * y + e,
    a * (x + item.width) + c * (y + fontHeight) + e,
  ];
  const ys = [
    b * x + d * y + f,
    b * (x + item.width) + d * (y + fontHeight) + f,
  ];
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    baseline: Math.max(...ys),
    fontHeight,
  };
}
