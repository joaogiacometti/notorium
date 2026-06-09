"use client";

import { useEffect } from "react";

/** The two interaction tools: marquee select vs. drag-to-pan. */
export type MindmapMode = "select" | "hand";

interface UseMindmapModeKeysParams {
  setMode: (mode: MindmapMode) => void;
  /** Track Space-hold so releasing it restores the previous mode. */
  setSpaceHeld: (held: boolean) => void;
  /** Delete/Backspace handler: removes the current selection (subtree-aware). */
  deleteSelected: () => void;
}

/** The action a keydown maps to, or null when the key is irrelevant. */
type ModeKeyAction =
  | { kind: "mode"; mode: MindmapMode }
  | { kind: "space" }
  | { kind: "delete" }
  | null;

/**
 * True when the event originated in a text field, so tool shortcuts don't fire
 * while the user is typing a node label, edge label, or the mindmap title.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

/** Map a keydown to its tool action; exported for unit tests. */
export function resolveModeKey(event: KeyboardEvent): ModeKeyAction {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (key === "v") {
    return { kind: "mode", mode: "select" };
  }
  if (key === "h") {
    return { kind: "mode", mode: "hand" };
  }
  if (event.key === " " || key === "spacebar") {
    return { kind: "space" };
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    return { kind: "delete" };
  }
  return null;
}

/**
 * Tool shortcuts for the mindmap canvas: `V` selects, `H` pans,
 * holding `Space` temporarily pans, and `Delete`/`Backspace` removes the
 * selection. Suppressed while typing in a field.
 *
 * @example
 * useMindmapModeKeys({ setMode, setSpaceHeld, deleteSelected });
 */
export function useMindmapModeKeys({
  setMode,
  setSpaceHeld,
  deleteSelected,
}: UseMindmapModeKeysParams): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      const action = resolveModeKey(event);
      if (!action) {
        return;
      }
      if (action.kind === "mode") {
        setMode(action.mode);
      } else if (action.kind === "space") {
        event.preventDefault();
        setSpaceHeld(true);
      } else {
        deleteSelected();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " || event.key.toLowerCase() === "spacebar") {
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setMode, setSpaceHeld, deleteSelected]);
}
