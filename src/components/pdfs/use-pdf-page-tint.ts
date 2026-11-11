"use client";

import { useState } from "react";

const PDF_PAGE_TINTS = ["original", "sepia", "dark"] as const;
export type PdfPageTint = (typeof PDF_PAGE_TINTS)[number];

const STORAGE_KEY = "notorium:pdf-page-tint";

function isPdfPageTint(value: unknown): value is PdfPageTint {
  return PDF_PAGE_TINTS.some((tint) => tint === value);
}

// Storage can be unavailable (private browsing, blocked site data); the tint
// then works for the open reader only.
function readStoredTint(): PdfPageTint {
  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    return isPdfPageTint(stored) ? stored : "original";
  } catch {
    return "original";
  }
}

/**
 * The paper color PDF pages are shown on, remembered on this device across
 * PDFs. The reader only renders in the browser, so storage is read directly.
 *
 * @example
 * const [pageTint, setPageTint] = usePdfPageTint();
 */
export function usePdfPageTint(): [PdfPageTint, (tint: string) => void] {
  const [tint, setTint] = useState(readStoredTint);

  function changeTint(next: string) {
    if (!isPdfPageTint(next)) return;
    setTint(next);
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Kept for this reader only.
    }
  }

  return [tint, changeTint];
}
