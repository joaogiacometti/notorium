"use client";

import { useScrollCapability } from "@embedpdf/plugin-scroll/react";
import { type ZoomLevel, ZoomMode } from "@embedpdf/plugin-zoom";
import { useZoom } from "@embedpdf/plugin-zoom/react";
import { useEffect, useRef, useState } from "react";
import { updateBookZoom } from "@/app/actions/library";
import {
  isValidStoredZoom,
  type ReaderDevice,
  ZOOM_MODES,
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

// Mirrors the pan plugin's touch heuristic so "mobile" means the same device
// class across the reader. Computed once; a reader session does not switch
// between a touch and a pointer device mid-read.
function detectReaderDevice(): ReaderDevice {
  if (typeof window === "undefined") return "desktop";
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return isTouch ? "mobile" : "desktop";
}

// The default the zoom plugin opens at (see book-reader-surface). Used as the
// dedupe baseline when the book has no saved zoom so the auto-fit on open is
// not persisted as a "change".
const DEFAULT_ZOOM_STRING: string = ZoomMode.FitPage;

function serializeZoomLevel(level: ZoomLevel): string {
  return typeof level === "number" ? String(level) : level;
}

// Turns a stored string back into a plugin ZoomLevel. Mode strings equal the
// `ZoomMode` enum values, so a known mode passes through; anything else is a
// numeric scale.
function parseStoredZoom(value: string): ZoomLevel {
  if ((ZOOM_MODES as readonly string[]).includes(value)) {
    return value as ZoomMode;
  }
  return Number(value);
}

/**
 * Restores the reader's saved zoom for the current device class once the
 * document is laid out, then persists zoom changes for that device. Debounces
 * saves, dedupes redundant writes, and flushes on tab-hide/unmount so a settling
 * pinch is not lost. Mobile and desktop zoom are stored independently, so the
 * same book keeps separate zooms per device.
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
  const hasRestoredRef = useRef(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const lastSavedRef = useRef(
    initialZoom && isValidStoredZoom(initialZoom)
      ? initialZoom
      : DEFAULT_ZOOM_STRING,
  );
  const latestZoomRef = useRef(lastSavedRef.current);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  latestZoomRef.current = serializeZoomLevel(state.zoomLevel);

  // Mark the scroller's initial layout ready; the apply effect below waits on
  // this so the saved zoom lands on top of the plugin's auto-fit, not racing it.
  useEffect(() => {
    if (!scrollCapability || layoutReady) return;
    const unsubscribe = scrollCapability.onLayoutReady((event) => {
      if (event.documentId !== documentId || !event.isInitial) return;
      setLayoutReady(true);
    });
    return unsubscribe;
  }, [scrollCapability, documentId, layoutReady]);

  // Apply the saved zoom once both the layout is ready and the zoom capability
  // is available, then enable saves. Seeding lastSaved with the restored value
  // (above) dedupes the change this triggers. Depends on `zoom` so a capability
  // that lags the layout event is not missed.
  useEffect(() => {
    if (hasRestoredRef.current || !layoutReady || !zoom) return;
    hasRestoredRef.current = true;
    if (initialZoom && isValidStoredZoom(initialZoom)) {
      zoom.requestZoom(parseStoredZoom(initialZoom));
    }
  }, [layoutReady, zoom, initialZoom]);

  // Debounce-persist the current zoom after restore, skipping redundant writes.
  useEffect(() => {
    if (!hasRestoredRef.current) return;
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
      if (!hasRestoredRef.current || zoomValue === lastSavedRef.current) {
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
