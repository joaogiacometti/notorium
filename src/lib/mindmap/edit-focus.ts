"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * True when a textarea blur happened because the browser window lost focus.
 *
 * @example shouldKeepMindmapEditorAfterBlur()
 */
export function shouldKeepMindmapEditorAfterBlur(): boolean {
  return typeof document !== "undefined" && !document.hasFocus();
}

/**
 * Restores focus to an active mindmap label editor after returning to the app.
 *
 * @example useMindmapWindowFocusRestore(editing, textareaRef)
 */
export function useMindmapWindowFocusRestore(
  editing: boolean,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
): void {
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const restoreFocus = () => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(
        () => textareaRef.current?.focus(),
        0,
      );
    };
    window.addEventListener("focus", restoreFocus);
    return () => {
      window.removeEventListener("focus", restoreFocus);
      window.clearTimeout(timeoutRef.current);
    };
  }, [editing, textareaRef]);
}
