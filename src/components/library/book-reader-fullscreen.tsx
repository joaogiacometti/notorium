"use client";

import { createContext, useContext } from "react";

export interface ReaderFullscreenValue {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

// CSS-driven fullscreen for the book reader, matching note/mindmap zen mode: an
// in-app overlay (no browser Fullscreen API) so the same z-index ladder keeps
// menus, dialogs, windows, and toasts layered above it. The surface owns the
// state and applies the overlay class; the toolbar toggles through this context.
export const ReaderFullscreenContext =
  createContext<ReaderFullscreenValue | null>(null);

export function useReaderFullscreen(): ReaderFullscreenValue {
  const value = useContext(ReaderFullscreenContext);
  if (!value) {
    throw new Error(
      "useReaderFullscreen must be used within ReaderFullscreenContext.Provider",
    );
  }
  return value;
}
