"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ListTree,
  Minus,
  Plus,
} from "lucide-react";
import { type FormEvent, type RefObject, useState } from "react";
import {
  PDF_ZOOM_MAX,
  PDF_ZOOM_MIN,
  type PdfZoom,
  parsePageInput,
  stepPdfZoom,
} from "@/components/pdfs/pdf-page-layout";
import {
  activePdfZoomPreset,
  formatPdfZoom,
  PDF_ZOOM_PRESETS,
  PdfViewSettings,
} from "@/components/pdfs/pdf-view-settings";
import type { PdfPageTint } from "@/components/pdfs/use-pdf-page-tint";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PdfReaderToolbarProps {
  currentPage: number;
  pageCount: number;
  zoom: PdfZoom;
  /** Rendered size as a ratio of the page's actual size. */
  zoomRatio: number;
  onZoomChange: (zoom: PdfZoom) => void;
  onPageJump: (page: number) => void;
  canGoBack: boolean;
  onGoBack: () => void;
  contentsOpen: boolean;
  contentsToggleRef: RefObject<HTMLButtonElement | null>;
  onToggleContents: () => void;
  trimMargins: boolean;
  /** False when the PDF has no text column to trim to, such as scans. */
  canTrimMargins: boolean;
  onTrimMarginsChange: (trim: boolean) => void;
  pageTint: PdfPageTint;
  onPageTintChange: (tint: string) => void;
  /** Takes the bar away while the reader moves down the pages. */
  hidden?: "phones" | "everywhere";
}

export function PdfReaderToolbar({
  currentPage,
  pageCount,
  zoom,
  zoomRatio,
  onZoomChange,
  onPageJump,
  canGoBack,
  onGoBack,
  contentsOpen,
  contentsToggleRef,
  onToggleContents,
  trimMargins,
  canTrimMargins,
  onTrimMarginsChange,
  pageTint,
  onPageTintChange,
  hidden,
}: Readonly<PdfReaderToolbarProps>) {
  return (
    <fieldset
      aria-label="PDF reading controls"
      className={cn(
        "order-last flex min-w-0 shrink-0 items-center justify-between gap-1 border-t border-border bg-background px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:order-first sm:flex-wrap sm:gap-2 sm:border-0 sm:p-0",
        hidden === "phones" && "max-sm:hidden",
        hidden === "everywhere" && "hidden",
      )}
    >
      <div className="flex min-w-0 items-center sm:gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 sm:size-9"
          aria-label="Table of contents"
          ref={contentsToggleRef}
          title="Table of contents"
          aria-expanded={contentsOpen}
          aria-controls={contentsOpen ? "pdf-table-of-contents" : undefined}
          onClick={onToggleContents}
        >
          <ListTree className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Back to previous location"
          className={cn(
            "size-10 sm:size-9",
            !canGoBack && "hidden sm:inline-flex",
          )}
          title="Back to previous location"
          disabled={!canGoBack}
          onClick={onGoBack}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous page"
          className="size-10 sm:size-9"
          disabled={currentPage <= 1}
          onClick={() => onPageJump(currentPage - 1)}
        >
          <ChevronUp className="size-4" />
        </Button>
        <PageJumpField
          key={currentPage}
          currentPage={currentPage}
          pageCount={pageCount}
          onPageJump={onPageJump}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next page"
          className="size-10 sm:size-9"
          disabled={currentPage >= pageCount}
          onClick={() => onPageJump(currentPage + 1)}
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Zoom out"
          className="hidden sm:inline-flex"
          disabled={zoomRatio <= PDF_ZOOM_MIN}
          onClick={() =>
            onZoomChange({ kind: "ratio", ratio: stepPdfZoom(zoomRatio, -1) })
          }
        >
          <Minus className="size-4" />
        </Button>
        <ZoomPresetMenu
          zoom={zoom}
          zoomRatio={zoomRatio}
          onZoomChange={onZoomChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Zoom in"
          className="hidden sm:inline-flex"
          disabled={zoomRatio >= PDF_ZOOM_MAX}
          onClick={() =>
            onZoomChange({ kind: "ratio", ratio: stepPdfZoom(zoomRatio, 1) })
          }
        >
          <Plus className="size-4" />
        </Button>
        <PdfViewSettings
          zoom={zoom}
          zoomRatio={zoomRatio}
          onZoomChange={onZoomChange}
          trimMargins={trimMargins}
          canTrimMargins={canTrimMargins}
          onTrimMarginsChange={onTrimMarginsChange}
          pageTint={pageTint}
          onPageTintChange={onPageTintChange}
        />
      </div>
    </fieldset>
  );
}

type ZoomPresetMenuProps = Pick<
  PdfReaderToolbarProps,
  "zoom" | "zoomRatio" | "onZoomChange"
>;

// The pdf.js viewer's zoom presets. Wide layouts only: the phone reading bar
// has no room for the percentage, so its zoom controls sit in view settings.
function ZoomPresetMenu({
  zoom,
  zoomRatio,
  onZoomChange,
}: Readonly<ZoomPresetMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden h-8 min-w-16 tabular-nums sm:inline-flex"
          aria-label="Zoom presets"
        >
          {formatPdfZoom(zoomRatio)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={activePdfZoomPreset(zoom)}
          onValueChange={(value) => {
            const preset = PDF_ZOOM_PRESETS.find(({ id }) => id === value);
            if (preset) onZoomChange(preset.zoom);
          }}
        >
          {PDF_ZOOM_PRESETS.map((preset) => (
            <DropdownMenuRadioItem key={preset.id} value={preset.id}>
              {preset.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PageJumpFieldProps {
  currentPage: number;
  pageCount: number;
  onPageJump: (page: number) => void;
}

// Keyed by the current page, so the draft resets whenever scrolling moves on.
function PageJumpField({
  currentPage,
  pageCount,
  onPageJump,
}: Readonly<PageJumpFieldProps>) {
  const [draft, setDraft] = useState(String(currentPage));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const page = parsePageInput(draft, pageCount);
    if (page === null) {
      setDraft(String(currentPage));
      return;
    }
    setDraft(String(page));
    onPageJump(page);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Input
        aria-label="Page number"
        inputMode="numeric"
        enterKeyHint="go"
        className="h-10 w-12 px-1 text-center text-base tabular-nums sm:h-8 sm:w-14 sm:text-sm"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => setDraft(String(currentPage))}
      />
      <span className="whitespace-nowrap text-xs tabular-nums sm:text-sm">
        / {pageCount}
      </span>
    </form>
  );
}
