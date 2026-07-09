"use client";

import { useScrollCapability } from "@embedpdf/plugin-scroll/react";
import { type ZoomLevel, ZoomMode } from "@embedpdf/plugin-zoom";
import { useZoom } from "@embedpdf/plugin-zoom/react";
import { useEffect, useRef, useState } from "react";
import { updateBookZoom } from "@/app/actions/library";
import { detectReaderDevice } from "@/components/library/reader-device";
import {
  parseStoredZoomLevel,
  type ReaderDevice,
} from "@/features/library/zoom";

// How long after the zoom stops changing before we persist it. Long enough that
// a continuous pinch or wheel zoom saves once it settles, not on every frame.
const SAVE_DEBOUNCE_MS = 700;

interface UseReaderZoomOptions {
  documentId: string;
  bookId: string;
  initialZoomMobile: string | null;
  initialZoomDesktop: string | null;
}

// The default the zoom plugin opens at (see book-reader-surface). Used as the
// dedupe baseline when the book has no saved zoom so the auto-fit on open is
// not persisted as a "change".
const DEFAULT_ZOOM_STRING: string = ZoomMode.FitPage;

function serializeZoomLevel(level: ZoomLevel): string {
  return typeof level === "number" ? String(level) : level;
}

/**
 * Persists zoom changes for the current device class. The initial zoom is
 * supplied to EmbedPDF's ZoomPluginPackage as `defaultZoomLevel` when the reader
 * is created, so this hook only starts saving after that configured default is
 * visible in plugin state.
 *
 * @example
 * useReaderZoom({ documentId, bookId, initialZoomMobile, initialZoomDesktop });
 */
export function useReaderZoom({
  documentId,
  bookId,
  initialZoomMobile,
  initialZoomDesktop,
}: UseReaderZoomOptions): void {
  const { state, provides: zoom } = useZoom(documentId);
  const { provides: scrollCapability } = useScrollCapability();
  const deviceRef = useRef<ReaderDevice>(detectReaderDevice());
  const initialZoom =
    deviceRef.current === "mobile" ? initialZoomMobile : initialZoomDesktop;
  const initialZoomLevel = initialZoom
    ? parseStoredZoomLevel(initialZoom)
    : null;
  const expectedInitialZoom =
    initialZoomLevel === null
      ? DEFAULT_ZOOM_STRING
      : serializeZoomLevel(initialZoomLevel as ZoomLevel);
  const savesEnabledRef = useRef(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const lastSavedRef = useRef(expectedInitialZoom);
  const latestZoomRef = useRef(lastSavedRef.current);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  latestZoomRef.current = serializeZoomLevel(state.zoomLevel);

  // Mark the scroller's initial layout ready before enabling saves, so the
  // plugin's configured default zoom does not get mistaken for a user change.
  useEffect(() => {
    if (!scrollCapability || layoutReady) return;
    const unsubscribe = scrollCapability.onLayoutReady((event) => {
      if (event.documentId !== documentId || !event.isInitial) return;
      setLayoutReady(true);
    });
    return unsubscribe;
  }, [scrollCapability, documentId, layoutReady]);

  // Wait until useZoom reports the default we gave EmbedPDF at registration.
  // That keeps the hook from persisting its temporary initial "automatic" state.
  useEffect(() => {
    if (savesEnabledRef.current || !layoutReady || !zoom) {
      return;
    }
    const zoomValue = serializeZoomLevel(state.zoomLevel);
    if (zoomValue !== lastSavedRef.current) {
      return;
    }
    savesEnabledRef.current = true;
  }, [layoutReady, zoom, state.zoomLevel]);

  // Debounce-persist the current zoom after restore, skipping redundant writes.
  useEffect(() => {
    if (!savesEnabledRef.current) return;
    const zoomValue = serializeZoomLevel(state.zoomLevel);
    if (zoomValue === lastSavedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedRef.current = zoomValue;
      void updateBookZoom({
        bookId,
        device: deviceRef.current,
        zoom: zoomValue,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.zoomLevel, bookId]);

  // Persist immediately when the tab is hidden or the reader unmounts.
  useEffect(() => {
    function flush() {
      const zoomValue = latestZoomRef.current;
      if (!savesEnabledRef.current || zoomValue === lastSavedRef.current) {
        return;
      }
      lastSavedRef.current = zoomValue;
      void updateBookZoom({
        bookId,
        device: deviceRef.current,
        zoom: zoomValue,
      });
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
