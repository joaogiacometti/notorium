"use client";

import { type RefObject, useEffect, useState } from "react";
import {
  buildPdfContext,
  type PdfStudyText,
} from "@/components/assistant/study-context-content";
import { useStudyContext } from "@/components/assistant/use-study-context";
import { joinPdfTextItems, normalizePdfText } from "@/components/pdfs/pdf-text";

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
  const selection = usePdfSelection(pagesRef);
  const pageText = useVisiblePageText(pdfDocument, currentPage);
  const source = selection ?? pageText;
  useStudyContext(source ? buildPdfContext(pdf, subjectPath, source) : null);
}

interface KeptPdfSelection {
  source: PdfStudyText;
  range: Range;
}

function usePdfSelection(
  pagesRef: RefObject<HTMLElement | null>,
): PdfStudyText | null {
  const [kept, setKept] = useState<KeptPdfSelection | null>(null);
  const [nativeInPages, setNativeInPages] = useState(false);
  useEffect(() => {
    const pages = pagesRef.current;
    if (!pages) return;
    // Only pressing on the pages clears the selection. A selection can also
    // collapse when the text layer re-renders (opening the assistant resizes
    // the column) or focus moves to the chat composer; both keep it.
    const clearSelection = () => setKept(null);
    function readSelection() {
      const current = window.getSelection();
      const anchor = current?.anchorNode;
      const inPages = Boolean(anchor && pages?.contains(anchor));
      setNativeInPages(inPages && !current?.isCollapsed);
      if (!current || !anchor || !inPages) return;
      const selected = readPdfSelection(current, anchor);
      if (selected) setKept(selected);
    }
    pages.addEventListener("pointerdown", clearSelection);
    document.addEventListener("selectionchange", readSelection);
    return () => {
      pages.removeEventListener("pointerdown", clearSelection);
      document.removeEventListener("selectionchange", readSelection);
    };
  }, [pagesRef]);
  useKeptSelectionHighlight(nativeInPages ? null : (kept?.range ?? null));
  return kept?.source ?? null;
}

function readPdfSelection(
  selection: Selection,
  anchor: Node,
): KeptPdfSelection | null {
  const element = anchor instanceof Element ? anchor : anchor.parentElement;
  const pageElement = element?.closest<HTMLElement>("[data-page-number]");
  const page = Number(pageElement?.dataset.pageNumber);
  const text = normalizePdfText(selection.toString());
  if (!text || !Number.isInteger(page) || page < 1) return null;
  const range = selection.getRangeAt(0).cloneRange();
  return { source: { page, scope: "selection", text }, range };
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
