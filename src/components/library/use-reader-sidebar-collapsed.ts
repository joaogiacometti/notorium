"use client";

import { useState } from "react";

const STORAGE_KEY = "notorium:reader-sidebar-collapsed";

interface ReaderSidebarCollapsedControl {
  collapsed: boolean;
  toggle: () => void;
}

/**
 * Reader sidebar collapsed state persisted to localStorage so the choice
 * survives reloads and reopening books. The book reader is client-only
 * (loaded through next/dynamic with ssr: false), so reading localStorage
 * during initialization does not cause a hydration mismatch.
 *
 * @example
 * const { collapsed, toggle } = useReaderSidebarCollapsed();
 */
export function useReaderSidebarCollapsed(): ReaderSidebarCollapsedControl {
  const [collapsed, setCollapsed] = useState(() => readCollapsedPreference());

  function toggle() {
    setCollapsed((previous) => {
      const next = !previous;
      globalThis.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return { collapsed, toggle };
}

function readCollapsedPreference(): boolean {
  if (globalThis.window === undefined) return false;
  return globalThis.localStorage.getItem(STORAGE_KEY) === "true";
}
