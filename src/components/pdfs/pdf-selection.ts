import { normalizePdfText } from "@/components/pdfs/pdf-text";

export interface PdfTextSelection {
  text: string;
  range: Range;
  /** First and last page in reading order, whichever way the user dragged. */
  startPage: HTMLElement;
  endPage: HTMLElement;
}

/**
 * The native selection, when it is non-empty text entirely within the pages.
 * @example readPdfTextSelection(window.getSelection(), pagesElement);
 */
export function readPdfTextSelection(
  native: Selection,
  pages: HTMLElement,
): PdfTextSelection | null {
  if (native.isCollapsed || native.rangeCount === 0) return null;
  const range = native.getRangeAt(0);
  if (
    !pages.contains(range.startContainer) ||
    !pages.contains(range.endContainer)
  )
    return null;
  const startPage = pageOf(range.startContainer);
  const endPage = pageOf(range.endContainer);
  const text = normalizePdfText(native.toString());
  if (!startPage || !endPage || !text) return null;
  return { text, range, startPage, endPage };
}

function pageOf(node: Node): HTMLElement | null {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest<HTMLElement>("[data-page-number]") ?? null;
}
