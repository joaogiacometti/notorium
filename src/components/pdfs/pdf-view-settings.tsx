"use client";

import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useId } from "react";
import {
  PDF_FIT_AUTO,
  PDF_FIT_PAGE,
  PDF_FIT_WIDTH,
  PDF_ZOOM_MAX,
  PDF_ZOOM_MIN,
  type PdfZoom,
  stepPdfZoom,
} from "@/components/pdfs/pdf-page-layout";
import type { PdfPageTint } from "@/components/pdfs/use-pdf-page-tint";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const PDF_ZOOM_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  zoom: PdfZoom;
}> = [
  { id: "auto", label: "Automatic", zoom: PDF_FIT_AUTO },
  { id: "page", label: "Page fit", zoom: PDF_FIT_PAGE },
  { id: "width", label: "Page width", zoom: PDF_FIT_WIDTH },
  { id: "actual", label: "Actual size", zoom: { kind: "ratio", ratio: 1 } },
];

export function activePdfZoomPreset(zoom: PdfZoom): string {
  if (zoom.kind === "fit") return zoom.mode;
  return zoom.ratio === 1 ? "actual" : "";
}

export function formatPdfZoom(zoomRatio: number): string {
  return `${Math.round(zoomRatio * 100)}%`;
}

const PAGE_TINTS: ReadonlyArray<{ id: PdfPageTint; label: string }> = [
  { id: "original", label: "Original" },
  { id: "sepia", label: "Sepia" },
  { id: "dark", label: "Dark" },
];

const SECTION_LABEL = "text-sm font-medium";

interface PdfViewSettingsProps {
  zoom: PdfZoom;
  /** Rendered size as a ratio of the page's actual size. */
  zoomRatio: number;
  onZoomChange: (zoom: PdfZoom) => void;
  trimMargins: boolean;
  /** False when the PDF has no text column to trim to, such as scans. */
  canTrimMargins: boolean;
  onTrimMarginsChange: (trim: boolean) => void;
  pageTint: PdfPageTint;
  onPageTintChange: (tint: string) => void;
}

/**
 * How the pages look: paper color and margin trimming, plus zoom on phones,
 * whose reading bar has no room for the zoom controls. A panel rather than a
 * menu, so it stays open while the reader tries settings against the page.
 *
 * @example
 * <PdfViewSettings zoom={zoom} zoomRatio={1} onZoomChange={setZoom} ... />
 */
export function PdfViewSettings({
  zoom,
  zoomRatio,
  onZoomChange,
  trimMargins,
  canTrimMargins,
  onTrimMarginsChange,
  pageTint,
  onPageTintChange,
}: Readonly<PdfViewSettingsProps>) {
  const trimId = useId();
  const activePreset = activePdfZoomPreset(zoom);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 sm:size-9"
          aria-label="View settings"
          title="View settings"
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="View settings"
        collisionPadding={8}
        sideOffset={8}
        className="grid w-72 gap-4 p-4 max-sm:w-[calc(100vw-1rem)] max-sm:gap-5"
      >
        <div className="grid gap-2 sm:hidden">
          <div className="flex items-center justify-between">
            <span className={SECTION_LABEL}>Zoom</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label="Zoom out"
                disabled={zoomRatio <= PDF_ZOOM_MIN}
                onClick={() =>
                  onZoomChange({
                    kind: "ratio",
                    ratio: stepPdfZoom(zoomRatio, -1),
                  })
                }
              >
                <Minus className="size-4" />
              </Button>
              <output className="min-w-12 text-center text-sm tabular-nums">
                {formatPdfZoom(zoomRatio)}
              </output>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label="Zoom in"
                disabled={zoomRatio >= PDF_ZOOM_MAX}
                onClick={() =>
                  onZoomChange({
                    kind: "ratio",
                    ratio: stepPdfZoom(zoomRatio, 1),
                  })
                }
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PDF_ZOOM_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-10 px-1 font-normal",
                  preset.id === activePreset && "bg-muted",
                )}
                aria-pressed={preset.id === activePreset}
                onClick={() => onZoomChange(preset.zoom)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
        <fieldset className="grid gap-2">
          <legend className={cn(SECTION_LABEL, "mb-2")}>Page color</legend>
          <div className="grid grid-cols-3 gap-2">
            {PAGE_TINTS.map((tint) => {
              const selected = tint.id === pageTint;
              return (
                <button
                  key={tint.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPageTintChange(tint.id)}
                  className="group grid gap-1.5 rounded-md text-xs outline-none max-sm:text-sm"
                >
                  <span
                    aria-hidden
                    data-pdf-paper-swatch={tint.id}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-md border border-border text-sm font-medium transition-colors group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50",
                      selected && "border-primary ring-1 ring-primary",
                    )}
                  >
                    Aa
                  </span>
                  <span
                    className={
                      selected ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {tint.label}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex min-h-6 items-center justify-between gap-4">
          <label
            htmlFor={trimId}
            className={cn(SECTION_LABEL, !canTrimMargins && "opacity-50")}
          >
            Trim margins
          </label>
          <Switch
            id={trimId}
            checked={trimMargins}
            disabled={!canTrimMargins}
            onCheckedChange={onTrimMarginsChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
