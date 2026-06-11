"use client";

import { useEffect } from "react";
import { isEditableTarget } from "@/lib/mindmap/use-mindmap-mode-keys";

/** True for a plain Ctrl/Cmd+C with no Alt or Shift modifier. */
export function isCopyChord(event: KeyboardEvent): boolean {
  if (event.key.toLowerCase() !== "c" || event.altKey || event.shiftKey) {
    return false;
  }
  return event.ctrlKey || event.metaKey;
}

/**
 * Copies the current node selection on Ctrl/Cmd+C. Suppressed while typing in a
 * field, and yields to a live text selection so ordinary copy still works.
 * `copySelected` returns true when it handled the event (so the browser's own
 * copy is prevented) and false when there was nothing to copy.
 *
 * @example useMindmapCopyKey(copySelected);
 */
export function useMindmapCopyKey(copySelected: () => boolean): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCopyChord(event) || isEditableTarget(event.target)) {
        return;
      }
      if ((window.getSelection()?.toString().length ?? 0) > 0) {
        return;
      }
      if (copySelected()) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelected]);
}
