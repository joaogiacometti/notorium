"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "notorium:sidebar-collapsed";

interface SidebarCollapsedControl {
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
}

/**
 * Desktop left-menu collapsed state, persisted to localStorage so the choice
 * survives reloads. Defaults to expanded on the server and first client render
 * (avoiding hydration mismatch), then loads the stored value on mount.
 *
 * @example
 * const { collapsed, setCollapsed } = useSidebarCollapsed();
 */
export function useSidebarCollapsed(): SidebarCollapsedControl {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    setCollapsedState(window.localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function setCollapsed(next: boolean) {
    setCollapsedState(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }

  return { collapsed, setCollapsed };
}
