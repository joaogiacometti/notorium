"use client";

import { useAnnotation } from "@embedpdf/plugin-annotation/react";
import { useEffect, useRef } from "react";
import { HIGHLIGHT_TOOL_ID } from "@/components/library/book-reader-annotation-config";
import { isEditableTarget } from "@/lib/shortcuts/registry";

/**
 * Listens for the "s" key and toggles the highlight annotation tool on/off.
 * Mirrors the click on the Highlight button in the reader's interaction tools
 * panel. Uses a ref to track the current tool state so the event handler always
 * reads the latest value without re-registering the listener on every toggle.
 *
 * @example
 * useReaderAnnotationShortcut(documentId);
 */
export function useReaderAnnotationShortcut(documentId: string) {
  const { provides: annotationApi, state } = useAnnotation(documentId);
  const isHighlightingRef = useRef(false);

  // Sync the reactive state into a ref so the stable event handler sees the
  // latest value without needing to re-register the listener each toggle.
  isHighlightingRef.current = state?.activeToolId === HIGHLIGHT_TOOL_ID;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      if (event.key.toLowerCase() !== "y") return;
      event.preventDefault();
      annotationApi?.setActiveTool(
        isHighlightingRef.current ? null : HIGHLIGHT_TOOL_ID,
      );
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [annotationApi]);
}
