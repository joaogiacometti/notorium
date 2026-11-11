import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PdfPageSize } from "@/components/pdfs/pdf-page-layout";
import {
  measurePdfTextCrop,
  type PdfTextCrop,
} from "@/components/pdfs/pdf-text-crop";

const A4_POINTS: PdfPageSize = { width: 595, height: 842 };

/** What the reader needs to lay out a loaded PDF before any page renders. */
export interface OpenedPdf {
  pdfDocument: PDFDocumentProxy;
  pageCount: number;
  initialPage: number;
  /** The opening page's size, assumed for pages that have not loaded yet. */
  basePage: PdfPageSize;
  /** The text block of the opening pages; null when there is nothing to trim. */
  textCrop: PdfTextCrop | null;
}

/**
 * Page count, clamped opening page, and the opening page's size and text crop.
 *
 * @example setOpened(await openPdfAt(document, pdf.lastPage));
 */
export async function openPdfAt(
  document: PDFDocumentProxy,
  savedPage: number,
): Promise<OpenedPdf> {
  const initialPage = Math.min(Math.max(1, savedPage), document.numPages);
  return {
    pdfDocument: document,
    pageCount: document.numPages,
    initialPage,
    basePage: await readPageSize(document, initialPage),
    textCrop: await readTextCrop(document, initialPage),
  };
}

// Trimming is an enhancement: a page that fails to measure opens untrimmed.
async function readTextCrop(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<PdfTextCrop | null> {
  try {
    return await measurePdfTextCrop(document, pageNumber);
  } catch {
    return null;
  }
}

// Measuring a real page before the first layout keeps placeholder heights
// right, so pages loading in later rarely resize and shift the column.
async function readPageSize(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<PdfPageSize> {
  try {
    const viewport = (await document.getPage(pageNumber)).getViewport({
      scale: 1,
    });
    return { width: viewport.width, height: viewport.height };
  } catch {
    return A4_POINTS;
  }
}
