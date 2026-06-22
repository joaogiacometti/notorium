"use client";

import { SpreadMode } from "@embedpdf/plugin-spread";
import { useSpread } from "@embedpdf/plugin-spread/react";
import { ZoomMode } from "@embedpdf/plugin-zoom";
import { useZoom } from "@embedpdf/plugin-zoom/react";
import { useEffect } from "react";
import { useReaderFullscreen } from "@/components/library/book-reader-fullscreen";
import { isEditableTarget } from "@/lib/shortcuts/registry";

interface UseReaderDisplayShortcutsOptions {
  documentId: string;
}

// Cmd/Ctrl+= zooms in, Cmd/Ctrl+- zooms out, Cmd/Ctrl+0 fits width,
// f toggles fullscreen, and d toggles two-page spread.
export function useReaderDisplayShortcuts({
  documentId,
}: Readonly<UseReaderDisplayShortcutsOptions>) {
  const zoom = useZoom(documentId);
  const spread = useSpread(documentId);
  const { toggleFullscreen } = useReaderFullscreen();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      if (event.metaKey || event.ctrlKey) {
        if (event.altKey || event.shiftKey) return;

        if (event.code === "Equal") {
          event.preventDefault();
          zoom.provides?.zoomIn();
          return;
        }
        if (event.code === "Minus") {
          event.preventDefault();
          zoom.provides?.zoomOut();
          return;
        }
        if (event.key === "0") {
          event.preventDefault();
          zoom.provides?.requestZoom(ZoomMode.FitWidth);
          return;
        }
        return;
      }

      if (event.altKey) return;

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }
      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        const isSpread = spread.spreadMode !== SpreadMode.None;
        spread.provides?.setSpreadMode(
          isSpread ? SpreadMode.None : SpreadMode.Odd,
        );
      }
    }

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [zoom.provides, spread.provides, spread.spreadMode, toggleFullscreen]);
}
