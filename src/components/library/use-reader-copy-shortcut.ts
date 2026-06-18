"use client";

import { useSelectionCapability } from "@embedpdf/plugin-selection/react";
import { useEffect, useRef } from "react";
import { isEditableTarget } from "@/lib/shortcuts/registry";

// Bridges Ctrl/Cmd+C to EmbedPDF's synthetic text selection. The reader paints
// its own selection and sets select-none, so the browser's native copy never
// sees the highlighted text; this copies it through the selection plugin when a
// selection is active and otherwise leaves native copy untouched (e.g. while the
// page-number input is focused). See ReaderSelectionMenu for the on-screen
// button that covers touch, where there is no Ctrl+C.
export function useReaderCopyShortcut(documentId: string) {
  const selection = useSelectionCapability();
  const hasSelection = useRef(false);

  useEffect(() => {
    const scope = selection.provides?.forDocument(documentId);
    if (!scope) return;
    return scope.onSelectionChange((range) => {
      hasSelection.current = range !== null;
    });
  }, [selection.provides, documentId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCopy = (event.metaKey || event.ctrlKey) && event.key === "c";
      if (!isCopy || !hasSelection.current || isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      selection.provides?.forDocument(documentId).copyToClipboard();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection.provides, documentId]);
}
