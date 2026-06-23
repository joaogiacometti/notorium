import type { ReaderDevice } from "@/features/library/zoom";

// Touch heuristic shared by the reader's client code so "mobile" means the same
// device class everywhere — zoom persistence (per-device) and the link-indicator
// offset compensation both key off this. Mirrors the pan plugin's touch default
// (book-reader-surface registers PanPlugin with defaultMode: "mobile"). Computed
// on demand from the current environment; a reader session does not switch
// between a touch and a pointer device mid-read.
//
// @example
// const device = detectReaderDevice(); // "mobile" on a phone/tablet
export function detectReaderDevice(): ReaderDevice {
  if (typeof window === "undefined") return "desktop";
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return isTouch ? "mobile" : "desktop";
}
