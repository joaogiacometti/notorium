"use client";

import { useEffect } from "react";

/** The two interaction tools: marquee select vs. drag-to-pan. */
export type MindmapMode = "select" | "hand";

interface UseMindmapShortcutsParams {
  enabled?: boolean;
  setMode: (mode: MindmapMode) => void;
  setSpaceHeld: (held: boolean) => void;
  deleteSelected: () => void;
  addChildToSelected: () => void;
  addSiblingToSelected: () => void;
  copySelected: () => boolean;
  undo: () => void;
  redo: () => void;
}

type MindmapKeyAction =
  | { kind: "mode"; mode: MindmapMode }
  | { kind: "space" }
  | { kind: "delete" }
  | { kind: "add-child" }
  | { kind: "add-sibling" }
  | null;

/**
 * Wires the mindmap canvas keyboard shortcuts in one module-owned place.
 *
 * @example
 * useMindmapShortcuts({ setMode, setSpaceHeld, deleteSelected, addChildToSelected, addSiblingToSelected, copySelected, undo, redo });
 */
export function useMindmapShortcuts({
  enabled = true,
  setMode,
  setSpaceHeld,
  deleteSelected,
  addChildToSelected,
  addSiblingToSelected,
  copySelected,
  undo,
  redo,
}: UseMindmapShortcutsParams): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      handleMindmapKeyDown(event, {
        setMode,
        setSpaceHeld,
        deleteSelected,
        addChildToSelected,
        addSiblingToSelected,
        copySelected,
        undo,
        redo,
      });
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
    enabled,
    setMode,
    setSpaceHeld,
    deleteSelected,
    addChildToSelected,
    addSiblingToSelected,
    copySelected,
    undo,
    redo,
  ]);
}

function handleMindmapKeyDown(
  event: KeyboardEvent,
  actions: UseMindmapShortcutsParams,
) {
  if (handleHistoryKey(event, actions.undo, actions.redo)) return;
  if (handleCopyKey(event, actions.copySelected)) return;
  if (isEditableTarget(event.target)) return;
  const action = resolveMindmapKey(event);
  if (!action) return;
  runMindmapKeyAction(event, action, actions);
}

/** Map a keydown to its canvas action; exported for unit tests. */
export function resolveMindmapKey(event: KeyboardEvent): MindmapKeyAction {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === "v") return { kind: "mode", mode: "select" };
  if (key === "h") return { kind: "mode", mode: "hand" };
  if (event.key === " " || key === "spacebar") return { kind: "space" };
  if (event.key === "Delete" || event.key === "Backspace") {
    return { kind: "delete" };
  }
  if (event.key === "Tab" && !event.shiftKey) return { kind: "add-child" };
  if (event.key === "Enter" && event.shiftKey) return { kind: "add-sibling" };
  return null;
}

/** True for a plain Ctrl/Cmd+C with no Alt or Shift modifier. */
export function isMindmapCopyChord(event: KeyboardEvent): boolean {
  if (event.key.toLowerCase() !== "c" || event.altKey || event.shiftKey) {
    return false;
  }
  return event.ctrlKey || event.metaKey;
}

/** True when the event originated in a text field or editable node label. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function handleHistoryKey(
  event: KeyboardEvent,
  undo: () => void,
  redo: () => void,
): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") {
    return false;
  }
  event.preventDefault();
  if (event.shiftKey) redo();
  else undo();
  return true;
}

function handleCopyKey(
  event: KeyboardEvent,
  copySelected: () => boolean,
): boolean {
  if (!isMindmapCopyChord(event) || isEditableTarget(event.target)) {
    return false;
  }
  if ((window.getSelection()?.toString().length ?? 0) > 0) return false;
  if (!copySelected()) return false;
  event.preventDefault();
  return true;
}

function runMindmapKeyAction(
  event: KeyboardEvent,
  action: NonNullable<MindmapKeyAction>,
  actions: UseMindmapShortcutsParams,
) {
  if (action.kind === "mode") {
    actions.setMode(action.mode);
    return;
  }
  if (action.kind === "space") {
    event.preventDefault();
    actions.setSpaceHeld(true);
    return;
  }
  event.preventDefault();
  if (action.kind === "add-child") actions.addChildToSelected();
  else if (action.kind === "add-sibling") actions.addSiblingToSelected();
  else actions.deleteSelected();
}
