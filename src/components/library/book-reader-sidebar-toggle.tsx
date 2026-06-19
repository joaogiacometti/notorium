"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReaderSidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

// Sidebar collapse/expand control mounted on the sidebar↔canvas boundary and
// vertically centered there — the edge users reach for to push a panel. When the
// sidebar is collapsed the canvas left edge becomes the screen edge, so this
// stays pinned as the single re-expand button and never disappears. The glyph
// communicates the result: « collapses, » expands. Desktop-only, matching the
// sidebar (hidden below md).
export function ReaderSidebarToggle({
  isCollapsed,
  onToggle,
}: Readonly<ReaderSidebarToggleProps>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!isCollapsed}
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="absolute left-0 top-1/2 z-10 hidden size-6 -translate-y-1/2 rounded-l-none border border-l-0 border-border/70 bg-background/95 text-muted-foreground shadow-sm hover:text-foreground md:flex"
    >
      {isCollapsed ? (
        <ChevronRight className="size-4" />
      ) : (
        <ChevronLeft className="size-4" />
      )}
    </Button>
  );
}
