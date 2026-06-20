"use client";

import { Minus, X } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  type ResizeEdge,
  useWindowDrag,
} from "@/components/windows/use-window-drag";
import { WindowContent } from "@/components/windows/window-content";
import {
  useWindowManager,
  type WindowInstance,
} from "@/components/windows/window-manager-context";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface WindowOverlayProps {
  aiEnabled: boolean;
  subjects: SubjectOption[];
}

/**
 * Renders every open window into a body portal. Only the active window is
 * visible; the rest stay mounted but hidden so their editor state survives
 * minimize/restore. The portal wrapper ignores pointer events so the page
 * behind (e.g. the PDF reader) stays interactive around the panel; Esc
 * minimizes the active window. Each window can be dragged and resized so the
 * user can park it aside and keep reading the page underneath.
 */
export function WindowOverlay({
  aiEnabled,
  subjects,
}: Readonly<WindowOverlayProps>) {
  const { windows, activeWindowId, minimizeActive } = useWindowManager();

  useEffect(() => {
    if (!activeWindowId) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        minimizeActive();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeWindowId, minimizeActive]);

  if (windows.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-40">
      {windows.map((window) => (
        <WindowFrame
          key={window.id}
          window={window}
          active={window.id === activeWindowId}
          aiEnabled={aiEnabled}
          subjects={subjects}
        />
      ))}
    </div>,
    document.body,
  );
}

const RESIZE_HANDLES: ReadonlyArray<{ edge: ResizeEdge; className: string }> = [
  { edge: "n", className: "inset-x-0 top-0 h-1.5 cursor-ns-resize" },
  { edge: "s", className: "inset-x-0 bottom-0 h-1.5 cursor-ns-resize" },
  { edge: "e", className: "inset-y-0 right-0 w-1.5 cursor-ew-resize" },
  { edge: "w", className: "inset-y-0 left-0 w-1.5 cursor-ew-resize" },
  { edge: "ne", className: "top-0 right-0 size-3 cursor-nesw-resize" },
  { edge: "nw", className: "top-0 left-0 size-3 cursor-nwse-resize" },
  { edge: "se", className: "right-0 bottom-0 size-3 cursor-nwse-resize" },
  { edge: "sw", className: "bottom-0 left-0 size-3 cursor-nesw-resize" },
];

interface WindowFrameProps {
  window: WindowInstance;
  active: boolean;
  aiEnabled: boolean;
  subjects: SubjectOption[];
}

function WindowFrame({
  window,
  active,
  aiEnabled,
  subjects,
}: Readonly<WindowFrameProps>) {
  const { requestCloseWindow, minimizeActive, setWindowGeometry } =
    useWindowManager();
  const frameRef = useRef<HTMLDivElement>(null);
  const { startMove, startResize } = useWindowDrag(
    frameRef,
    window.geometry,
    (geometry) => setWindowGeometry(window.id, geometry),
  );

  function handleHeaderPointerDown(event: ReactPointerEvent) {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    startMove(event);
  }

  return (
    <div
      ref={frameRef}
      aria-hidden={!active}
      style={{
        left: window.geometry.x,
        top: window.geometry.y,
        width: window.geometry.width,
        height: window.geometry.height,
      }}
      className={cn(
        "pointer-events-auto absolute flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl",
        active ? "flex" : "hidden",
      )}
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        className="flex shrink-0 cursor-move touch-none select-none items-center gap-2 border-border border-b bg-muted/30 px-3 py-2"
      >
        <span className="min-w-0 flex-1 truncate font-medium text-sm">
          {window.title}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Minimize window"
          onClick={minimizeActive}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Close window"
          onClick={() => requestCloseWindow(window.id)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <WindowContent
          window={window}
          aiEnabled={aiEnabled}
          subjects={subjects}
        />
      </div>
      {RESIZE_HANDLES.map((handle) => (
        <div
          key={handle.edge}
          aria-hidden
          onPointerDown={(event) => startResize(handle.edge, event)}
          className={cn("absolute z-10 touch-none", handle.className)}
        />
      ))}
    </div>
  );
}
