"use client";

import { useSelectionCapability } from "@embedpdf/plugin-selection/react";
import { Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Gap between the pointer and the button, and a rough button footprint used to
// keep it from spilling off the viewport edges.
const POINTER_GAP = 12;
const ESTIMATED_WIDTH = 92;
const ESTIMATED_HEIGHT = 44;

interface PointerAnchor {
  x: number;
  y: number;
}

interface ReaderSelectionMenuProps {
  documentId: string;
}

// Floating "Copy" button anchored to where the pointer finished selecting, so it
// lands right next to the cursor instead of at the corner of the selection's
// bounding box (which drifts far away on multi-line selections and was awkward
// to click). EmbedPDF's selection is synthetic and the reader sets select-none,
// so the browser's own copy can't see the text — this copies through the plugin,
// which also covers touch where there is no Ctrl+C.
export function ReaderSelectionMenu({
  documentId,
}: Readonly<ReaderSelectionMenuProps>) {
  const selection = useSelectionCapability();
  const pointer = useRef<PointerAnchor>({ x: 0, y: 0 });
  const [anchor, setAnchor] = useState<PointerAnchor | null>(null);

  // Capture phase so the position is recorded before the selection plugin's
  // own pointerup handling emits onEndSelection. Covers mouse, touch, and pen.
  useEffect(() => {
    function trackPointer(event: PointerEvent) {
      pointer.current = { x: event.clientX, y: event.clientY };
    }
    window.addEventListener("pointerup", trackPointer, true);
    return () => window.removeEventListener("pointerup", trackPointer, true);
  }, []);

  useEffect(() => {
    const scope = selection.provides?.forDocument(documentId);
    if (!scope) return;
    const stops = [
      scope.onEndSelection(() => {
        setAnchor(scope.getState().selection ? pointer.current : null);
      }),
      scope.onSelectionChange((range) => {
        if (!range) setAnchor(null);
      }),
    ];
    return () => {
      for (const stop of stops) stop();
    };
  }, [selection.provides, documentId]);

  // A scroll moves the synthetic selection but not a viewport-fixed button, so
  // dismiss rather than let it float somewhere stale. Capture catches scrolls
  // from the nested viewport, which do not bubble.
  useEffect(() => {
    if (!anchor) return;
    function dismiss() {
      setAnchor(null);
    }
    document.addEventListener("scroll", dismiss, true);
    return () => document.removeEventListener("scroll", dismiss, true);
  }, [anchor]);

  if (!anchor) return null;

  function copySelection() {
    const scope = selection.provides?.forDocument(documentId);
    scope?.copyToClipboard();
    scope?.clear();
    setAnchor(null);
  }

  const left = Math.min(
    anchor.x + POINTER_GAP,
    window.innerWidth - ESTIMATED_WIDTH,
  );
  const top = Math.min(
    anchor.y + POINTER_GAP,
    window.innerHeight - ESTIMATED_HEIGHT,
  );

  return (
    <button
      type="button"
      onClick={copySelection}
      style={{ left, top }}
      className="fixed z-50 flex items-center gap-1.5 rounded-md border border-border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-md hover:bg-accent hover:text-accent-foreground"
    >
      <Copy className="size-4" />
      Copy
    </button>
  );
}
