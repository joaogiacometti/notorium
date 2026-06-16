"use client";

import { useScroll, useScrollCapability } from "@embedpdf/plugin-scroll/react";
import { useEffect, useRef } from "react";
import { updateReadingPage } from "@/app/actions/library";

// How long after the visible page stops changing before we persist it. Long
// enough that a continuous scroll through many pages saves once, not per page.
const SAVE_DEBOUNCE_MS = 900;

interface UseReadingPositionOptions {
  documentId: string;
  bookId: string;
  initialPage: number;
}

/**
 * Restores the reader to its saved page once the document loads and persists
 * the current page as the user scrolls. Debounces scroll-driven saves, dedupes
 * redundant writes, and flushes on tab-hide/unmount so a mid-scroll exit is not
 * lost. Replaces the bespoke IntersectionObserver tracker now that EmbedPDF's
 * scroll plugin reports the current page directly.
 *
 * @example
 * useReadingPosition({ documentId, bookId, initialPage });
 */
export function useReadingPosition({
  documentId,
  bookId,
  initialPage,
}: UseReadingPositionOptions): void {
  const { state } = useScroll(documentId);
  const { provides: capability } = useScrollCapability();
  const hasRestoredRef = useRef(false);
  const lastSavedRef = useRef(initialPage);
  const latestPageRef = useRef(initialPage);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  latestPageRef.current = state.currentPage || latestPageRef.current;

  // Restore the saved page only once the scroller's initial layout is ready, so
  // the jump lands on a measured page instead of no-opping at the top. Jumping
  // "instant" avoids reporting the intermediate pages a smooth scroll would
  // cross, which the save effect would otherwise persist over the saved page.
  // Seeding lastSaved/latest with the restored page dedupes the resulting move.
  useEffect(() => {
    if (!capability || hasRestoredRef.current) return;
    const unsubscribe = capability.onLayoutReady((event) => {
      if (
        event.documentId !== documentId ||
        !event.isInitial ||
        hasRestoredRef.current
      ) {
        return;
      }
      const page = Math.min(Math.max(initialPage, 1), event.totalPages);
      hasRestoredRef.current = true;
      lastSavedRef.current = page;
      latestPageRef.current = page;
      if (page > 1) {
        capability
          .forDocument(documentId)
          .scrollToPage({ pageNumber: page, behavior: "instant" });
      }
    });
    return unsubscribe;
  }, [capability, documentId, initialPage]);

  // Debounce-persist the current page after restore, skipping redundant writes.
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    const page = state.currentPage;
    if (page < 1 || page === lastSavedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedRef.current = page;
      void updateReadingPage({
        bookId,
        page,
        totalPages: state.totalPages || undefined,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.currentPage, state.totalPages, bookId]);

  // Persist immediately when the tab is hidden or the reader unmounts.
  useEffect(() => {
    function flush() {
      const page = latestPageRef.current;
      if (
        !hasRestoredRef.current ||
        page < 1 ||
        page === lastSavedRef.current
      ) {
        return;
      }
      lastSavedRef.current = page;
      void updateReadingPage({ bookId, page });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flush();
    };
  }, [bookId]);
}
