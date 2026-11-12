"use client";

import { useState } from "react";
import {
  clampPdfZoom,
  PDF_FIT_AUTO,
  type PdfZoom,
} from "@/components/pdfs/pdf-page-layout";

const ZOOM_KEY = "notorium:pdf-zoom";
const TRIM_KEY = "notorium:pdf-trim-margins";
const FIT_MODES = ["auto", "page", "width"] as const;

// Storage can be unavailable (private browsing, blocked site data); the
// setting then works for the open reader only.
function readStored(key: string): string | null {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    // Kept for this reader only.
  }
}

function parseStoredZoom(stored: string | null): PdfZoom {
  const fit = FIT_MODES.find((mode) => mode === stored);
  if (fit) return { kind: "fit", mode: fit };
  const ratio = Number.parseFloat(stored ?? "");
  return Number.isFinite(ratio)
    ? { kind: "ratio", ratio: clampPdfZoom(ratio) }
    : PDF_FIT_AUTO;
}

function readStoredTrim(): boolean | null {
  const stored = readStored(TRIM_KEY);
  if (stored === "on") return true;
  return stored === "off" ? false : null;
}

/**
 * The zoom PDFs open at, remembered on this device across PDFs like the page
 * color. The reader only renders in the browser, so storage is read directly.
 *
 * @example
 * const [zoom, setZoom] = usePdfZoomMemory();
 */
export function usePdfZoomMemory(): [PdfZoom, (zoom: PdfZoom) => void] {
  const [zoom, setZoom] = useState(() => parseStoredZoom(readStored(ZOOM_KEY)));

  function changeZoom(next: PdfZoom) {
    setZoom(next);
    writeStored(ZOOM_KEY, next.kind === "fit" ? next.mode : String(next.ratio));
  }

  return [zoom, changeZoom];
}

/**
 * Whether page margins are trimmed, remembered on this device. Null until
 * the reader chooses: phones then trim and wider screens do not.
 *
 * @example
 * const [trimMargins, setTrimMargins] = usePdfTrimMemory();
 */
export function usePdfTrimMemory(): [boolean | null, (trim: boolean) => void] {
  const [trim, setTrim] = useState(readStoredTrim);

  function changeTrim(next: boolean) {
    setTrim(next);
    writeStored(TRIM_KEY, next ? "on" : "off");
  }

  return [trim, changeTrim];
}
