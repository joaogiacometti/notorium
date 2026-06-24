"use client";

import { useAnnotation } from "@embedpdf/plugin-annotation/react";
import { useInteractionManagerCapability } from "@embedpdf/plugin-interaction-manager/react";
import { useSelectionCapability } from "@embedpdf/plugin-selection/react";
import { SpreadMode } from "@embedpdf/plugin-spread";
import { useSpread } from "@embedpdf/plugin-spread/react";
import { ZoomMode } from "@embedpdf/plugin-zoom";
import { useZoom } from "@embedpdf/plugin-zoom/react";
import { type RefObject, useEffect, useRef } from "react";
import { HIGHLIGHT_TOOL_ID } from "@/components/library/book-reader-annotation-config";
import { useReaderFullscreen } from "@/components/library/book-reader-fullscreen";
import {
  PAN_MODE,
  POINTER_MODE,
  type ReaderInteractionMode,
} from "@/components/library/reader-interaction-modes";
import { isEditableTarget } from "@/lib/shortcuts/registry";

interface UseReaderShortcutsOptions {
  documentId: string;
  onToggleSidebar: () => void;
}

/**
 * Wires the reader's module-level keyboard shortcuts.
 *
 * @example
 * useReaderShortcuts({ documentId, onToggleSidebar });
 */
export function useReaderShortcuts({
  documentId,
  onToggleSidebar,
}: Readonly<UseReaderShortcutsOptions>) {
  useReaderToolShortcuts(documentId, onToggleSidebar);
  useReaderDisplayShortcuts(documentId);
  useReaderCopyShortcut(documentId);
}

interface UseReaderSearchShortcutOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  openSearch: () => void;
}

/**
 * Wires Cmd/Ctrl+F for the reader search control.
 *
 * @example
 * useReaderSearchShortcut({ inputRef, openSearch });
 */
export function useReaderSearchShortcut({
  inputRef,
  openSearch,
}: Readonly<UseReaderSearchShortcutOptions>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isFindShortcut(event)) return;
      if (event.target !== inputRef.current && isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      openSearch();
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [inputRef, openSearch]);
}

function useReaderToolShortcuts(
  documentId: string,
  onToggleSidebar: () => void,
) {
  const interaction = useInteractionManagerCapability();
  const { provides: annotationApi, state } = useAnnotation(documentId);
  const isHighlightingRef = useRef(false);
  isHighlightingRef.current = state?.activeToolId === HIGHLIGHT_TOOL_ID;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (handleSidebarShortcut(event, onToggleSidebar)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      const mode = modeForKey(event.key);
      if (mode) {
        event.preventDefault();
        annotationApi?.setActiveTool(null);
        interaction.provides?.forDocument(documentId).activate(mode);
        return;
      }
      if (event.key.toLowerCase() !== "y") return;
      event.preventDefault();
      annotationApi?.setActiveTool(
        isHighlightingRef.current ? null : HIGHLIGHT_TOOL_ID,
      );
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [annotationApi, documentId, interaction.provides, onToggleSidebar]);
}

function useReaderDisplayShortcuts(documentId: string) {
  const zoom = useZoom(documentId);
  const spread = useSpread(documentId);
  const { toggleFullscreen } = useReaderFullscreen();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      if (handleZoomShortcut(event, zoom.provides)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }
      if (event.key.toLowerCase() !== "d") return;
      event.preventDefault();
      const next = spread.spreadMode === SpreadMode.None;
      spread.provides?.setSpreadMode(next ? SpreadMode.Odd : SpreadMode.None);
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [zoom.provides, spread.provides, spread.spreadMode, toggleFullscreen]);
}

function useReaderCopyShortcut(documentId: string) {
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
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [selection.provides, documentId]);
}

function modeForKey(key: string): ReaderInteractionMode | null {
  if (key === "v" || key === "V") return POINTER_MODE;
  if (key === "h" || key === "H") return PAN_MODE;
  return null;
}

function handleSidebarShortcut(
  event: KeyboardEvent,
  onToggleSidebar: () => void,
): boolean {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
    return false;
  }
  if (event.key.toLowerCase() !== "b") return false;
  event.preventDefault();
  onToggleSidebar();
  return true;
}

function handleZoomShortcut(
  event: KeyboardEvent,
  zoom: ReturnType<typeof useZoom>["provides"],
): boolean {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
    return false;
  }
  if (event.code === "Equal") {
    event.preventDefault();
    zoom?.zoomIn();
    return true;
  }
  if (event.code === "Minus") {
    event.preventDefault();
    zoom?.zoomOut();
    return true;
  }
  if (event.key !== "0") return false;
  event.preventDefault();
  zoom?.requestZoom(ZoomMode.FitWidth);
  return true;
}

function isFindShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";
}
