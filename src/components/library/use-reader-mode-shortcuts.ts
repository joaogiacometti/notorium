"use client";

import { useInteractionManagerCapability } from "@embedpdf/plugin-interaction-manager/react";
import { useEffect } from "react";
import {
  PAN_MODE,
  POINTER_MODE,
  type ReaderInteractionMode,
} from "@/components/library/reader-interaction-modes";
import { isEditableTarget } from "@/lib/shortcuts/registry";

function modeForKey(key: string): ReaderInteractionMode | null {
  if (key === "v" || key === "V") return POINTER_MODE;
  if (key === "h" || key === "H") return PAN_MODE;
  return null;
}

// V selects text, H switches to the hand/pan tool — mirrors the mindmap canvas.
// Plain keys only: a modifier means a different command (Ctrl/Cmd+V is paste,
// Cmd+H hides the window on macOS), and typing in a field is left untouched.
export function useReaderModeShortcuts(documentId: string) {
  const interaction = useInteractionManagerCapability();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      const mode = modeForKey(event.key);
      if (!mode) return;
      event.preventDefault();
      interaction.provides?.forDocument(documentId).activate(mode);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [interaction.provides, documentId]);
}
