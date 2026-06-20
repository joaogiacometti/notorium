"use client";

import type { LucideIcon } from "lucide-react";
import { FileText, Layers, Network, X } from "lucide-react";
import {
  useWindowManager,
  type WindowKind,
} from "@/components/windows/window-manager-context";
import { cn } from "@/lib/utils";

const kindIcons: Record<WindowKind, LucideIcon> = {
  mindmap: Network,
  note: FileText,
  flashcard: Layers,
};

/**
 * Bottom-center taskbar listing every open window. Clicking a chip restores it
 * (minimizing whatever was visible) or minimizes it when already active, so the
 * user can alternate a window with the page behind. Renders nothing when no
 * windows are open.
 */
export function WindowDock() {
  const { windows, activeWindowId, toggle, requestCloseWindow } =
    useWindowManager();

  if (windows.length === 0) {
    return null;
  }

  return (
    <div className="-translate-x-1/2 fixed bottom-3 left-1/2 z-[45] flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 overflow-x-auto rounded-full border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur">
      {windows.map((window) => {
        const Icon = kindIcons[window.kind];
        const active = window.id === activeWindowId;
        return (
          <div
            key={window.id}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full py-1 pr-1 pl-2.5 text-sm",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-foreground hover:bg-muted",
            )}
          >
            <button
              type="button"
              className="flex min-w-0 items-center gap-1.5"
              onClick={() => toggle(window.id)}
              aria-pressed={active}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="max-w-40 truncate">{window.title}</span>
            </button>
            <button
              type="button"
              aria-label={`Close ${window.title}`}
              className={cn(
                "flex size-5 items-center justify-center rounded-full",
                active
                  ? "hover:bg-primary-foreground/20"
                  : "hover:bg-foreground/10",
              )}
              onClick={() => requestCloseWindow(window.id)}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
