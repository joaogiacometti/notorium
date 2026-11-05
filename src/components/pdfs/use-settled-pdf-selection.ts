"use client";

import { type RefObject, useEffect, useState } from "react";
import { readPdfTextSelection } from "@/components/pdfs/pdf-selection";
import { normalizePdfText } from "@/components/pdfs/pdf-text";
import {
  type ExplanationSelection,
  selectionTextSchema,
} from "@/features/assistant/selection-explanation-contract";
import { LIMITS } from "@/lib/config/limits";

export interface SettledPdfSelection extends ExplanationSelection {
  rect: DOMRect;
}

function isInsideSelectionActions(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("[data-selection-actions]") !== null
  );
}

/** The selection to offer actions for, once it settles, without touching copy. */
export function useSettledPdfSelection(
  pagesRef: RefObject<HTMLElement | null>,
) {
  const [selection, setSelection] = useState<SettledPdfSelection | null>(null);
  useEffect(() => {
    const pages = pagesRef.current;
    if (!pages) return;
    let pressing = false;
    let selectedDuringPress = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearTimeout(timer);
      setSelection(null);
    };
    const read = () => {
      if (isInsideSelectionActions(document.activeElement)) return;
      const native = window.getSelection();
      setSelection(native ? readSettledSelection(native, pages) : null);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(read, 180);
    };
    const selectionChange = () => {
      if (pressing) selectedDuringPress = true;
      else schedule();
    };
    const pointerDown = (event: PointerEvent) => {
      if (isInsideSelectionActions(event.target)) return;
      pressing = event.target instanceof Node && pages.contains(event.target);
      selectedDuringPress = false;
      clear();
    };
    const pointerUp = () => {
      if (!pressing) return;
      pressing = false;
      schedule();
    };
    // A touch long-press selects text and then cancels the pointer, while a
    // touch that becomes a scroll cancels it and leaves the selection alone.
    const pointerCancel = () => {
      pressing = false;
      if (selectedDuringPress) schedule();
      else clear();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clear();
    };
    const scroll = (event: Event) => {
      if (!isInsideSelectionActions(event.target)) clear();
    };
    document.addEventListener("selectionchange", selectionChange);
    document.addEventListener("pointerdown", pointerDown);
    document.addEventListener("pointerup", pointerUp);
    document.addEventListener("pointercancel", pointerCancel);
    document.addEventListener("keydown", keyDown);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", clear);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", selectionChange);
      document.removeEventListener("pointerdown", pointerDown);
      document.removeEventListener("pointerup", pointerUp);
      document.removeEventListener("pointercancel", pointerCancel);
      document.removeEventListener("keydown", keyDown);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", clear);
    };
  }, [pagesRef]);
  return { selection, dismiss: () => setSelection(null) };
}

function readSettledSelection(
  native: Selection,
  pages: HTMLElement,
): SettledPdfSelection | null {
  const selected = readPdfTextSelection(native, pages);
  if (!selected) return null;
  const parsed = selectionTextSchema.safeParse(selected.text);
  if (!parsed.success) return null;
  const { range, startPage, endPage } = selected;
  const rect = Array.from(range.getClientRects()).findLast(
    (item) => item.width > 0 && item.height > 0,
  );
  if (!rect) return null;
  if (parsed.data.length > LIMITS.assistantMessageMaxChars) {
    // Retain enough text to show the limit, without duplicating an entire
    // oversized selection into component state or changing native copying.
    return {
      text: parsed.data.slice(0, LIMITS.assistantMessageMaxChars + 1),
      context: "",
      rect,
    };
  }
  const before = range.cloneRange();
  before.selectNodeContents(startPage);
  before.setEnd(range.startContainer, range.startOffset);
  const after = range.cloneRange();
  after.selectNodeContents(endPage);
  after.setStart(range.endContainer, range.endOffset);
  const context = [
    normalizePdfText(before.toString().slice(-350)),
    normalizePdfText(after.toString().slice(0, 350)),
  ]
    .filter(Boolean)
    .join("\n[…]\n");
  return { text: parsed.data, context, rect };
}
