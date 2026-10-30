"use client";

import { type RefObject, useEffect, useRef } from "react";
import type { savePdfReadingPage } from "@/app/actions/pdfs";

const SAVE_DELAY_MS = 1500;

type SavePdfReadingPage = typeof savePdfReadingPage;

interface PdfReadingProgressInput {
  pdfId: string;
  page: number;
  pageCount: number;
  initialPage: number;
  save: SavePdfReadingPage;
}

interface ReadingProgressRefs {
  pending: RefObject<{ page: number; pageCount: number } | null>;
  savedPage: RefObject<number>;
}

function flushPendingPage(
  refs: ReadingProgressRefs,
  pdfId: string,
  save: SavePdfReadingPage,
): void {
  const pending = refs.pending.current;
  refs.pending.current = null;
  if (!pending || pending.page === refs.savedPage.current) {
    return;
  }
  refs.savedPage.current = pending.page;
  save({ id: pdfId, ...pending }).catch(() => {
    refs.savedPage.current = 0;
  });
}

/**
 * Persists the page being read once scrolling settles, and right away when
 * the tab is hidden, closed, or the reader unmounts. A failed save is dropped
 * silently: the next page change retries, and losing one position update is
 * harmless.
 *
 * @example
 * usePdfReadingProgress({ pdfId, page, pageCount, initialPage, save: savePdfReadingPage });
 */
export function usePdfReadingProgress({
  pdfId,
  page,
  pageCount,
  initialPage,
  save,
}: PdfReadingProgressInput): void {
  const savedPage = useRef(initialPage);
  const pending = useRef<{ page: number; pageCount: number } | null>(null);

  useEffect(() => {
    pending.current = { page, pageCount };
    const timer = window.setTimeout(
      () => flushPendingPage({ pending, savedPage }, pdfId, save),
      SAVE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [pdfId, page, pageCount, save]);

  useEffect(() => {
    const flush = () => flushPendingPage({ pending, savedPage }, pdfId, save);
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [pdfId, save]);
}
