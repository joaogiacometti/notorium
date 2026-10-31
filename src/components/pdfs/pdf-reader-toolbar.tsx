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
  PDF_FIT_PAGE,
  PDF_FIT_WIDTH,
  PDF_ZOOM_MAX,
  PDF_ZOOM_MIN,
  type PdfZoom,
  parsePageInput,
  stepPdfZoom,
} from "@/components/pdfs/pdf-page-layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
}: Readonly<PdfReaderToolbarProps>) {
  return (
    <fieldset
      aria-label="PDF reading controls"
      className="order-last flex min-w-0 shrink-0 items-center justify-between gap-1 border-t border-border bg-background px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:order-first sm:flex-wrap sm:gap-2 sm:border-0 sm:p-0"
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
          trimMargins={trimMargins}
          canTrimMargins={canTrimMargins}
          onTrimMarginsChange={onTrimMarginsChange}
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
      </div>
    </fieldset>
  );
}

const ZOOM_PRESETS: Record<string, PdfZoom> = {
  page: PDF_FIT_PAGE,
  width: PDF_FIT_WIDTH,
  actual: { kind: "ratio", ratio: 1 },
};

type ZoomPresetMenuProps = Pick<
  PdfReaderToolbarProps,
  | "zoom"
  | "zoomRatio"
  | "onZoomChange"
  | "trimMargins"
  | "canTrimMargins"
  | "onTrimMarginsChange"
>;

// The pdf.js viewer's zoom presets.
function ZoomPresetMenu({
  zoom,
  zoomRatio,
  onZoomChange,
  trimMargins,
  canTrimMargins,
  onTrimMarginsChange,
}: Readonly<ZoomPresetMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 min-w-12 px-1 tabular-nums sm:h-8 sm:min-w-16 sm:px-3"
          aria-label="Zoom presets"
        >
          {Math.round(zoomRatio * 100)}%
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="sm:hidden">
          <DropdownMenuItem
            disabled={zoomRatio <= PDF_ZOOM_MIN}
            onSelect={() =>
              onZoomChange({ kind: "ratio", ratio: stepPdfZoom(zoomRatio, -1) })
            }
          >
            <Minus /> Zoom out
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={zoomRatio >= PDF_ZOOM_MAX}
            onSelect={() =>
              onZoomChange({ kind: "ratio", ratio: stepPdfZoom(zoomRatio, 1) })
            }
          >
            <Plus /> Zoom in
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </div>
        <DropdownMenuRadioGroup
          value={activeZoomPreset(zoom)}
          onValueChange={(value) => {
            const preset = ZOOM_PRESETS[value];
            if (preset) onZoomChange(preset);
          }}
        >
          <DropdownMenuRadioItem value="page">Page fit</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="width">
            Page width
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="actual">
            Actual size
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={trimMargins}
          disabled={!canTrimMargins}
          onCheckedChange={onTrimMarginsChange}
        >
          Trim margins
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function activeZoomPreset(zoom: PdfZoom): string {
  if (zoom.kind === "fit") return zoom.mode;
  return zoom.ratio === 1 ? "actual" : "";
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
