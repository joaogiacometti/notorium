"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebarCollapse } from "@/components/shared/sidebar-collapse-context";
import { Button } from "@/components/ui/button";

/**
 * Collapse/expand control positioned at the right edge of the sidebar,
 * overlapping the border between sidebar and content (RemNote style).
 * Desktop only — the mobile sheet has its own toggle. Renders nothing
 * when there is no sidebar in scope.
 */
export function SidebarCollapseToggle() {
  const sidebar = useSidebarCollapse();
  if (!sidebar) {
    return null;
  }
  const Icon = sidebar.collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onClick={() => sidebar.setCollapsed(!sidebar.collapsed)}
      className="hidden size-8 shrink-0 text-muted-foreground hover:text-foreground lg:inline-flex"
    >
      <Icon className="size-4" />
    </Button>
  );
}
