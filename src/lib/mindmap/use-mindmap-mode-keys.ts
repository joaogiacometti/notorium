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
  /** Tab handler: adds a child to the current single-node selection. */
  addChildToSelected: () => void;
  /** Shift+Enter handler: adds a sibling below the current single-node selection. */
  addSiblingToSelected: () => void;
}

/** The action a keydown maps to, or null when the key is irrelevant. */
type ModeKeyAction =
  | { kind: "mode"; mode: MindmapMode }
  | { kind: "space" }
  | { kind: "delete" }
  | { kind: "add-child" }
  | { kind: "add-sibling" }
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
  if (event.key === "Tab" && !event.shiftKey) {
    return { kind: "add-child" };
  }
  if (event.key === "Enter" && event.shiftKey) {
    return { kind: "add-sibling" };
  }
  return null;
}

/**
 * Tool shortcuts for the mindmap canvas: `V` selects, `H` pans,
 * holding `Space` temporarily pans, `Delete`/`Backspace` removes the
 * selection, `Tab` adds a child, and `Shift+Enter` adds a sibling below
 * the selected node. Suppressed while typing.
 *
 * @example
 * useMindmapModeKeys({ setMode, setSpaceHeld, deleteSelected, addChildToSelected, addSiblingToSelected });
 */
export function useMindmapModeKeys({
  setMode,
  setSpaceHeld,
  deleteSelected,
  addChildToSelected,
  addSiblingToSelected,
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
      } else if (action.kind === "add-child") {
        event.preventDefault();
        addChildToSelected();
      } else if (action.kind === "add-sibling") {
        event.preventDefault();
        addSiblingToSelected();
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
  }, [
    setMode,
    setSpaceHeld,
    deleteSelected,
    addChildToSelected,
    addSiblingToSelected,
  ]);
}
