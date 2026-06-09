"use client";

import { useEffect, useState } from "react";

export interface ZenModeState {
  isZenMode: boolean;
  toggleZenMode: () => void;
}

/**
 * Tracks the distraction-free zen mode for document detail pages and exits it
 * on Escape. Skips Escape presses already consumed by another handler (Radix
 * dialogs and menus call preventDefault when they dismiss) so closing an open
 * dialog does not also leave zen mode.
 *
 * @example
 * const { isZenMode, toggleZenMode } = useZenMode();
 */
export function useZenMode(): ZenModeState {
  const [isZenMode, setIsZenMode] = useState(false);

  useEffect(() => {
    if (!isZenMode) {
      return;
    }

    function exitZenModeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      setIsZenMode(false);
    }

    document.addEventListener("keydown", exitZenModeOnEscape);
    return () => document.removeEventListener("keydown", exitZenModeOnEscape);
  }, [isZenMode]);

  return {
    isZenMode,
    toggleZenMode: () => setIsZenMode((current) => !current),
  };
}
