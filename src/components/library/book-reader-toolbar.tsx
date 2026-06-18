"use client";

import { useFullscreen } from "@embedpdf/plugin-fullscreen/react";
import { useInteractionManagerCapability } from "@embedpdf/plugin-interaction-manager/react";
import { usePan } from "@embedpdf/plugin-pan/react";
import { useScroll } from "@embedpdf/plugin-scroll/react";
import { SpreadMode } from "@embedpdf/plugin-spread";
import { useSpread } from "@embedpdf/plugin-spread/react";
import { ZoomMode } from "@embedpdf/plugin-zoom";
import { useZoom } from "@embedpdf/plugin-zoom/react";
import {
  ArrowLeft,
  Columns2,
  CornerUpLeft,
  Ellipsis,
  Hand,
  Maximize,
  Minimize,
  MousePointer2,
  MoveHorizontal,
  Square,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useReaderNavHistory } from "@/components/library/book-reader-nav-history";
import {
  PAN_MODE,
  POINTER_MODE,
  type ReaderInteractionMode,
} from "@/components/library/reader-interaction-modes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ReaderToolbarProps {
  documentId: string;
  title: string;
}

// Top control bar wired to EmbedPDF's zoom, spread, and fullscreen plugins.
// Each control reads live state from its plugin hook and calls back into the
// plugin's capability scope, so the viewer stays the single source of truth
// instead of mirroring state here. Left/right groups both flex-1 so the page
// navigator stays absolutely centered between them.
export function ReaderToolbar({
  documentId,
  title,
}: Readonly<ReaderToolbarProps>) {
  const zoom = useZoom(documentId);
  const spread = useSpread(documentId);
  const fullscreen = useFullscreen();
  const pan = usePan(documentId);
  const interaction = useInteractionManagerCapability();
  const navHistory = useReaderNavHistory();

  function activateMode(mode: ReaderInteractionMode) {
    interaction.provides?.forDocument(documentId).activate(mode);
  }

  const zoomPercent = Math.round((zoom.state?.currentZoomLevel ?? 1) * 100);
  const isSpread = spread.spreadMode !== SpreadMode.None;
  const isFullscreen = fullscreen.state.isFullscreen;

  return (
    <header className="relative flex items-center gap-1 border-b border-border/70 bg-background px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/library">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Library</span>
          </Link>
        </Button>
        <p className="ml-1 hidden min-w-0 truncate text-sm font-medium lg:block lg:max-w-[8rem] xl:max-w-[14rem] 2xl:max-w-xs">
          {title}
        </p>
        {navHistory.canGoBack && (
          <ToolbarButton
            label="Back to link origin"
            className="ml-1"
            onClick={navHistory.goBack}
          >
            <CornerUpLeft className="size-4" />
          </ToolbarButton>
        )}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <PageNavigator documentId={documentId} />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1">
        {/* Select/Move toggle: pick text selection or drag-to-scroll. Always
            visible so both desktop and touch users can switch — pan defaults on
            touch, selection on desktop, but either can override here. */}
        <div className="mr-1 flex items-center gap-0.5 rounded-md border border-border/70 p-0.5">
          <ToolbarButton
            label="Select text"
            active={!pan.isPanning}
            onClick={() => activateMode(POINTER_MODE)}
          >
            <MousePointer2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Move"
            active={pan.isPanning}
            onClick={() => activateMode(PAN_MODE)}
          >
            <Hand className="size-4" />
          </ToolbarButton>
        </div>
        <ToolbarButton
          label="Zoom out"
          className="hidden sm:flex"
          onClick={() => zoom.provides?.zoomOut()}
        >
          <ZoomOut className="size-4" />
        </ToolbarButton>
        <span className="hidden w-11 text-center text-xs tabular-nums text-muted-foreground sm:block">
          {zoomPercent}%
        </span>
        <ToolbarButton
          label="Zoom in"
          className="hidden sm:flex"
          onClick={() => zoom.provides?.zoomIn()}
        >
          <ZoomIn className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Fit width"
          className="hidden sm:flex"
          onClick={() => zoom.provides?.requestZoom(ZoomMode.FitWidth)}
        >
          <MoveHorizontal className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label={isSpread ? "Single page" : "Two pages"}
          active={isSpread}
          className="hidden sm:flex"
          onClick={() =>
            spread.provides?.setSpreadMode(
              isSpread ? SpreadMode.None : SpreadMode.Odd,
            )
          }
        >
          {isSpread ? (
            <Square className="size-4" />
          ) : (
            <Columns2 className="size-4" />
          )}
        </ToolbarButton>

        <ToolbarButton
          label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          active={isFullscreen}
          className="hidden sm:flex"
          onClick={() => fullscreen.provides?.toggleFullscreen()}
        >
          {isFullscreen ? (
            <Minimize className="size-4" />
          ) : (
            <Maximize className="size-4" />
          )}
        </ToolbarButton>

        {/* Mobile overflow dropdown: tools that don't fit on small screens. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More tools"
              title="More tools"
              className="size-8 text-muted-foreground hover:text-foreground sm:hidden"
            >
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => zoom.provides?.zoomOut()}
              className="gap-2.5"
            >
              <ZoomOut className="size-4" />
              Zoom out
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => zoom.provides?.zoomIn()}
              className="gap-2.5"
            >
              <ZoomIn className="size-4" />
              Zoom in
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {zoomPercent}%
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => zoom.provides?.requestZoom(ZoomMode.FitWidth)}
              className="gap-2.5"
            >
              <MoveHorizontal className="size-4" />
              Fit width
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => fullscreen.provides?.toggleFullscreen()}
              className="gap-2.5"
            >
              {isFullscreen ? (
                <Minimize className="size-4" />
              ) : (
                <Maximize className="size-4" />
              )}
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                spread.provides?.setSpreadMode(
                  isSpread ? SpreadMode.None : SpreadMode.Odd,
                )
              }
              className="gap-2.5"
            >
              {isSpread ? (
                <Square className="size-4" />
              ) : (
                <Columns2 className="size-4" />
              )}
              {isSpread ? "Single page" : "Two pages"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

interface PageNavigatorProps {
  documentId: string;
}

// Centered "Page X of Y" where X is an editable jump-to-page field. The input
// mirrors the live page from the scroll plugin except while the user is typing,
// and commits on Enter/blur by scrolling to the clamped page.
function PageNavigator({ documentId }: Readonly<PageNavigatorProps>) {
  const { state, provides } = useScroll(documentId);
  const [value, setValue] = useState(String(state.currentPage));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setValue(String(state.currentPage));
  }, [state.currentPage, isEditing]);

  function commit() {
    setIsEditing(false);
    const target = Number.parseInt(value, 10);
    if (!Number.isFinite(target) || state.totalPages < 1) {
      setValue(String(state.currentPage));
      return;
    }
    const page = Math.min(Math.max(target, 1), state.totalPages);
    setValue(String(page));
    provides?.scrollToPage({ pageNumber: page, behavior: "smooth" });
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="hidden sm:inline">Page</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Go to page"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={(event) => {
          setIsEditing(true);
          event.target.select();
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setValue(String(state.currentPage));
            setIsEditing(false);
            event.currentTarget.blur();
          }
        }}
        className="w-10 rounded border border-border/70 bg-background px-1 py-0.5 text-center tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="whitespace-nowrap">of {state.totalPages || "…"}</span>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({
  label,
  active,
  className,
  onClick,
  children,
}: Readonly<ToolbarButtonProps>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "size-8 text-muted-foreground hover:text-foreground",
        active && "bg-muted text-foreground",
        className,
      )}
    >
      {children}
    </Button>
  );
}
