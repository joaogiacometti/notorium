"use client";

import { createContext, useContext } from "react";

interface SidebarCollapseValue {
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseValue | null>(null);

export const SidebarCollapseProvider = SidebarCollapseContext.Provider;

/**
 * Reads the desktop sidebar collapse control exposed by the app shell. Returns
 * null outside the authenticated layout (e.g. immersive routes with no
 * sidebar), so callers render nothing when there is no sidebar to toggle.
 *
 * @example
 * const sidebar = useSidebarCollapse();
 * if (sidebar) sidebar.setCollapsed(true);
 */
export function useSidebarCollapse(): SidebarCollapseValue | null {
  return useContext(SidebarCollapseContext);
}
