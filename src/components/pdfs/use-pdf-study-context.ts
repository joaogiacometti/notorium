"use client";

import { type RefObject, useEffect, useState } from "react";
import {
  buildPdfContext,
  type PdfStudyText,
} from "@/components/assistant/study-context-content";
import { useStudyContext } from "@/components/assistant/use-study-context";
import { PDF_RENDER_WINDOW_PAGES } from "@/components/pdfs/pdf-page-layout";
import { readPdfTextSelection } from "@/components/pdfs/pdf-selection";
import { joinPdfTextItems } from "@/components/pdfs/pdf-text";

// Styled by `::highlight(pdf-kept-selection)` in globals.css.
const PDF_KEPT_SELECTION_HIGHLIGHT = "pdf-kept-selection";

/** The slice of a pdf.js document the assistant context reads text from. */
export interface PdfTextSource {
  getPage(pageNumber: number): Promise<{
    getTextContent(): Promise<{ items: ReadonlyArray<object> }>;
  }>;
}

interface UsePdfStudyContextOptions {
  pdf: { id: string; title: string };
  subjectPath: string;
  pdfDocument: PdfTextSource;
  currentPage: number;
  pagesRef: RefObject<HTMLElement | null>;
}

/**
 * Offer the assistant the user's PDF selection, else the visible page's text.
 * Text is gathered ahead of time because context snapshots are synchronous.
 * @example usePdfStudyContext({ pdf, subjectPath, pdfDocument, currentPage, pagesRef });
 */
export function usePdfStudyContext({
  pdf,
  subjectPath,
  pdfDocument,
  currentPage,
  pagesRef,
}: UsePdfStudyContextOptions): void {
  const selection = usePdfSelection(pagesRef, currentPage);
  const pageText = useVisiblePageText(pdfDocument, currentPage);
  const source = selection.source ?? pageText;
  useStudyContext(
    source ? buildPdfContext(pdf, subjectPath, source) : null,
    selection.clear,
  );
}

interface KeptPdfSelection {
  source: PdfStudyText;
  lastPage: number;
  range: Range;
}

function usePdfSelection(
  pagesRef: RefObject<HTMLElement | null>,
  currentPage: number,
): { source: PdfStudyText | null; clear: () => void } {
  const [kept, setKept] = useState<KeptPdfSelection | null>(null);
  const [nativeInPages, setNativeInPages] = useState(false);
  useEffect(() => {
    const pages = pagesRef.current;
    if (!pages) return;
    // Pressing on the pages clears the selection. A selection can also
    // collapse when the text layer re-renders (opening the assistant resizes
    // the column) or focus moves to the chat composer; both keep it.
    const clearSelection = () => setKept(null);
    function readSelection() {
      const current = window.getSelection();
      const anchor = current?.anchorNode;
      const inPages = Boolean(anchor && pages?.contains(anchor));
      setNativeInPages(inPages && !current?.isCollapsed);
      if (!current || !pages) return;
      const selected = readKeptSelection(current, pages);
      if (selected) setKept(selected);
    }
    pages.addEventListener("pointerdown", clearSelection);
    document.addEventListener("selectionchange", readSelection);
    return () => {
      pages.removeEventListener("pointerdown", clearSelection);
      document.removeEventListener("selectionchange", readSelection);
    };
  }, [pagesRef]);
  // Once its pages stop rendering, the selection is nowhere on screen and the
  // user is reading something else, so the visible page becomes the context.
  const outOfView =
    kept !== null &&
    (currentPage < kept.source.page - PDF_RENDER_WINDOW_PAGES ||
      currentPage > kept.lastPage + PDF_RENDER_WINDOW_PAGES);
  useEffect(() => {
    if (outOfView) setKept(null);
  }, [outOfView]);
  useKeptSelectionHighlight(nativeInPages ? null : (kept?.range ?? null));
  return {
    source: kept?.source ?? null,
    clear: () => {
      const native = window.getSelection();
      const anchor = native?.anchorNode;
      if (anchor && pagesRef.current?.contains(anchor))
        native?.removeAllRanges();
      setKept(null);
    },
  };
}

function readKeptSelection(
  native: Selection,
  pages: HTMLElement,
): KeptPdfSelection | null {
  const selected = readPdfTextSelection(native, pages);
  if (!selected) return null;
  const page = Number(selected.startPage.dataset.pageNumber);
  const lastPage = Number(selected.endPage.dataset.pageNumber);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(lastPage))
    return null;
  return {
    source: { page, scope: "selection", text: selected.text },
    lastPage,
    range: selected.range.cloneRange(),
  };
}

// Browsers show one selection per page, so focusing the chat composer hides
// the PDF selection the assistant still uses; paint it as a highlight there.
function useKeptSelectionHighlight(range: Range | null): void {
  useEffect(() => {
    if (!range || typeof Highlight === "undefined") return;
    CSS.highlights.set(PDF_KEPT_SELECTION_HIGHLIGHT, new Highlight(range));
    return () => {
      CSS.highlights.delete(PDF_KEPT_SELECTION_HIGHLIGHT);
    };
  }, [range]);
}

function useVisiblePageText(
  pdfDocument: PdfTextSource,
  page: number,
): PdfStudyText | null {
  const [loaded, setLoaded] = useState<PdfStudyText | null>(null);
  useEffect(() => {
    let active = true;
    // Keeps the previous page's text, labeled with its own page, while the
    // next loads. A failed read drops the context rather than claiming the
    // page has no text.
    loadPdfPageText(pdfDocument, page).then(
      (text) => active && setLoaded({ page, scope: "page", text }),
      () => active && setLoaded(null),
    );
    return () => {
      active = false;
    };
  }, [pdfDocument, page]);
  return loaded;
}

async function loadPdfPageText(
  pdfDocument: PdfTextSource,
  pageNumber: number,
): Promise<string> {
  const page = await pdfDocument.getPage(pageNumber);
  return joinPdfTextItems((await page.getTextContent()).items);
}
