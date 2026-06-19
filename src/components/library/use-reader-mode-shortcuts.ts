"use client";

import { useInteractionManagerCapability } from "@embedpdf/plugin-interaction-manager/react";
import { useEffect } from "react";
import {
  PAN_MODE,
  POINTER_MODE,
  type ReaderInteractionMode,
} from "@/components/library/reader-interaction-modes";
import { isEditableTarget } from "@/lib/shortcuts/registry";

interface UseReaderModeShortcutsOptions {
  documentId: string;
  onToggleSidebar?: () => void;
}

function modeForKey(key: string): ReaderInteractionMode | null {
  if (key === "v" || key === "V") return POINTER_MODE;
  if (key === "h" || key === "H") return PAN_MODE;
  return null;
}

// V selects text, H switches to the hand/pan tool, and Cmd/Ctrl+B toggles the
// sidebar. Plain keys only for mode switching: a modifier means a different
// command (Ctrl/Cmd+V is paste, Cmd+H hides the window on macOS), and typing in
// a field is left untouched. Cmd/Ctrl+B is the exception so the sidebar toggle
// mirrors the global shortcut.
export function useReaderModeShortcuts({
  documentId,
  onToggleSidebar,
}: Readonly<UseReaderModeShortcutsOptions>) {
  const interaction = useInteractionManagerCapability();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        if (event.key.toLowerCase() === "b") {
          event.preventDefault();
          onToggleSidebar?.();
        }
        return;
      }
      if (isEditableTarget(event.target)) return;
      const mode = modeForKey(event.key);
      if (!mode) return;
      event.preventDefault();
      interaction.provides?.forDocument(documentId).activate(mode);
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [interaction.provides, documentId, onToggleSidebar]);
}
