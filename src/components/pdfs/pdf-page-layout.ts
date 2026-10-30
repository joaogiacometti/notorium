export const PDF_PAGE_GAP_PX = 12;
export const PDF_ZOOM_MIN = 0.25;
export const PDF_ZOOM_MAX = 4;
// PDF sizes are in points (1/72 in); "actual size" shows them at CSS inches.
const PDF_POINTS_TO_CSS_PX = 96 / 72;
const PDF_ZOOM_STEP = 0.25;

/** Top offset of every page in the scroll column, with a gap between pages. */
export function buildPageTops(pageHeights: number[], gap: number): number[] {
  const tops: number[] = [];
  let offset = 0;
  for (const height of pageHeights) {
    tops.push(offset);
    offset += height + gap;
  }
  return tops;
}

/**
 * The 1-based page under a scroll offset: the last page whose top is at or
 * above it. Pages above the first top resolve to page 1.
 *
 * @example findPageAtOffset([0, 1000, 2000], 1500); // 2
 */
export function findPageAtOffset(pageTops: number[], offset: number): number {
  let low = 0;
  let high = pageTops.length - 1;
  let found = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (pageTops[middle] <= offset) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found + 1;
}

export interface ScrollAnchor {
  page: number;
  /** How far into the page the viewport top sits, from 0 to 1. */
  fraction: number;
}

export interface PageLayout {
  tops: number[];
  heights: number[];
}

/** The page and in-page position at a scroll offset, independent of zoom. */
export function scrollAnchorAt(
  layout: PageLayout,
  offset: number,
): ScrollAnchor {
  const page = findPageAtOffset(layout.tops, offset);
  const height = Math.max(1, layout.heights[page - 1]);
  const fraction = (offset - layout.tops[page - 1]) / height;
  return { page, fraction: Math.min(1, Math.max(0, fraction)) };
}

/** The scroll offset that puts an anchor back at the viewport top. */
export function scrollOffsetOf(
  layout: PageLayout,
  anchor: ScrollAnchor,
): number {
  const index = Math.min(anchor.page, layout.tops.length) - 1;
  return layout.tops[index] + anchor.fraction * layout.heights[index];
}

/**
 * How the reader sizes pages, after the pdf.js viewer: fit the whole page,
 * fit the column width, or a fixed ratio of the page's actual (printed) size.
 */
export type PdfZoom =
  | { kind: "fit"; mode: "page" | "width" }
  | { kind: "ratio"; ratio: number };

export const PDF_FIT_PAGE: PdfZoom = { kind: "fit", mode: "page" };

export interface PdfReaderFrame {
  columnWidth: number;
  columnHeight: number;
  padding: number;
}

/** Page size in points, as pdf.js reports it at scale 1. */
export interface PdfPageSize {
  width: number;
  height: number;
}

/**
 * Rendered page width for a zoom setting. Page fit shows a whole page on a
 * desktop and fits a phone's width; page width can be far taller than the
 * screen on wide monitors, which is why it is not the default.
 *
 * @example resolvePageWidth(PDF_FIT_PAGE, { columnWidth: 1400, columnHeight: 732, padding: 16 }, { width: 500, height: 700 }); // 500
 */
export function resolvePageWidth(
  zoom: PdfZoom,
  frame: PdfReaderFrame,
  page: PdfPageSize,
): number {
  if (zoom.kind === "ratio") {
    return Math.floor(page.width * PDF_POINTS_TO_CSS_PX * zoom.ratio);
  }
  const widthFit = frame.columnWidth - frame.padding * 2;
  const heightFit =
    ((frame.columnHeight - frame.padding * 2) * page.width) / page.height;
  const fitted =
    zoom.mode === "width" ? widthFit : Math.min(widthFit, heightFit);
  return Math.max(0, Math.floor(fitted));
}

/** Rendered width as a ratio of the page's actual size: what the toolbar shows. */
export function actualSizeRatio(pageWidth: number, page: PdfPageSize): number {
  return pageWidth / (page.width * PDF_POINTS_TO_CSS_PX);
}

// Browsers (iOS Safari most strictly) refuse or blank canvases above about
// 16.7 million pixels, so high zoom trades sharpness for a drawable canvas.
const MAX_CANVAS_PIXELS = 16_000_000;
const MAX_RENDER_PIXEL_RATIO = 2;

/** Device pixel ratio for a page canvas, bounded so the canvas stays drawable. */
export function pageRenderPixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
): number {
  const canvasLimit = Math.sqrt(
    MAX_CANVAS_PIXELS / Math.max(1, width * height),
  );
  return Math.min(deviceRatio, MAX_RENDER_PIXEL_RATIO, canvasLimit);
}

export function clampPdfZoom(zoom: number): number {
  return Math.min(PDF_ZOOM_MAX, Math.max(PDF_ZOOM_MIN, zoom));
}

/** Next zoom on the 25% ladder in a direction, so buttons land on round values. */
export function stepPdfZoom(zoom: number, direction: 1 | -1): number {
  const steps = zoom / PDF_ZOOM_STEP;
  const next =
    direction === 1
      ? Math.floor(steps + 1e-6) + 1
      : Math.ceil(steps - 1e-6) - 1;
  return clampPdfZoom(next * PDF_ZOOM_STEP);
}

/** Clamps a typed page number into the document, or null when not a number. */
export function parsePageInput(
  value: string,
  pageCount: number,
): number | null {
  const page = Number.parseInt(value, 10);
  if (Number.isNaN(page)) {
    return null;
  }
  return Math.min(pageCount, Math.max(1, page));
}
