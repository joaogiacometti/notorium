"use client";

import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  PDF_FIT_PAGE,
  PDF_ZOOM_MAX,
  PDF_ZOOM_MIN,
  type PdfZoom,
  parsePageInput,
  stepPdfZoom,
} from "@/components/pdfs/pdf-page-layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface PdfReaderToolbarProps {
  currentPage: number;
  pageCount: number;
  zoom: PdfZoom;
  /** Rendered size as a ratio of the page's actual size. */
  zoomRatio: number;
  onZoomChange: (zoom: PdfZoom) => void;
  onPageJump: (page: number) => void;
}

export function PdfReaderToolbar({
  currentPage,
  pageCount,
  zoom,
  zoomRatio,
  onZoomChange,
  onPageJump,
}: Readonly<PdfReaderToolbarProps>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageJump(currentPage - 1)}
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next page"
          disabled={currentPage >= pageCount}
          onClick={() => onPageJump(currentPage + 1)}
        >
          <ChevronDown className="size-4" />
        </Button>
        <PageJumpField
          key={currentPage}
          currentPage={currentPage}
          pageCount={pageCount}
          onPageJump={onPageJump}
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Zoom out"
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
          disabled={zoomRatio >= PDF_ZOOM_MAX}
          onClick={() =>
            onZoomChange({ kind: "ratio", ratio: stepPdfZoom(zoomRatio, 1) })
          }
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

const ZOOM_PRESETS: Record<string, PdfZoom> = {
  page: PDF_FIT_PAGE,
  width: { kind: "fit", mode: "width" },
  actual: { kind: "ratio", ratio: 1 },
};

interface ZoomPresetMenuProps {
  zoom: PdfZoom;
  zoomRatio: number;
  onZoomChange: (zoom: PdfZoom) => void;
}

// The pdf.js viewer's zoom presets.
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
          className="min-w-16 tabular-nums"
          aria-label="Zoom presets"
        >
          {Math.round(zoomRatio * 100)}%
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
        className="h-8 w-14 text-center tabular-nums"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => setDraft(String(currentPage))}
      />
      <span className="tabular-nums">/ {pageCount}</span>
    </form>
  );
}
