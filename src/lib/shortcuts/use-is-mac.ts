"use client";

import { useEffect, useState } from "react";

function detectIsMac(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const value = navigator.platform || navigator.userAgent || "";
  return /mac|iphone|ipad|ipod/i.test(value);
}

/**
 * Whether the current device uses Apple key conventions (⌘ instead of Ctrl).
 * Starts false to keep SSR output stable, then resolves on mount.
 *
 * @example
 * const isMac = useIsMac(); // true on macOS, false on Windows/Linux
 */
export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(detectIsMac());
  }, []);
  return isMac;
}
