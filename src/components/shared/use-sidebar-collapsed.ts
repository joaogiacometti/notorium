"use client";

import { useState } from "react";
import { setSidebarCollapsed } from "@/app/actions/sidebar";

const STORAGE_KEY = "notorium:sidebar-collapsed";

interface SidebarCollapsedControl {
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
}

/**
 * Desktop left-menu collapsed state, persisted to localStorage and a cookie so
 * the choice survives reloads without a visible transition. The server reads
 * the cookie and passes the initial value, so SSR and client hydration agree
 * from the first paint.
 *
 * @example
 * const { collapsed, setCollapsed } = useSidebarCollapsed(initialCollapsed);
 */
export function useSidebarCollapsed(
  initialCollapsed = false,
): SidebarCollapsedControl {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function persistCollapsed(next: boolean) {
    setCollapsed(next);
    globalThis.localStorage.setItem(STORAGE_KEY, String(next));
    void setSidebarCollapsed(next);
  }

  return { collapsed, setCollapsed: persistCollapsed };
}
