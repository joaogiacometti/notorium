"use client";

import { useScroll } from "@embedpdf/plugin-scroll/react";
import { ThumbImg, ThumbnailsPane } from "@embedpdf/plugin-thumbnail/react";
import { cn } from "@/lib/utils";

interface ReaderThumbnailsProps {
  documentId: string;
  readerColorInverted: boolean;
}

// Virtualized page-thumbnail rail. ThumbnailsPane only yields the rows in view,
// each carrying its absolute `top` offset; we position items with it and mount
// the real bitmap via ThumbImg, so large books never render every page at once.
// The sidebar owns the surrounding panel; this fills it.
export function ReaderThumbnails({
  documentId,
  readerColorInverted,
}: Readonly<ReaderThumbnailsProps>) {
  const { state, provides } = useScroll(documentId);

  return (
    <div className="h-full w-full bg-background">
      <ThumbnailsPane
        documentId={documentId}
        style={{ width: "100%", height: "100%" }}
      >
        {(meta) => (
          <ThumbnailRow
            key={meta.pageIndex}
            top={meta.top}
            height={meta.wrapperHeight}
            labelHeight={meta.labelHeight}
            pageNumber={meta.pageIndex + 1}
            isActive={meta.pageIndex + 1 === state.currentPage}
            readerColorInverted={readerColorInverted}
            onSelect={() =>
              provides?.scrollToPage({
                pageNumber: meta.pageIndex + 1,
                behavior: "instant",
              })
            }
          >
            <ThumbImg documentId={documentId} meta={meta} />
          </ThumbnailRow>
        )}
      </ThumbnailsPane>
    </div>
  );
}

interface ThumbnailRowProps {
  top: number;
  height: number;
  labelHeight: number;
  pageNumber: number;
  isActive: boolean;
  readerColorInverted: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

function ThumbnailRow({
  top,
  height,
  labelHeight,
  pageNumber,
  isActive,
  readerColorInverted,
  onSelect,
  children,
}: Readonly<ThumbnailRowProps>) {
  return (
    <div
      className="absolute inset-x-0 flex flex-col items-center justify-center gap-1"
      style={{ top, height }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Go to page ${pageNumber}`}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "overflow-hidden rounded border bg-background transition-colors",
          isActive
            ? "border-primary ring-2 ring-primary/40"
            : "border-border/70 hover:border-foreground/40",
        )}
      >
        {readerColorInverted ? (
          <span className="reader-invert">{children}</span>
        ) : (
          children
        )}
      </button>
      <span
        className={cn(
          "text-xs",
          isActive ? "font-medium text-foreground" : "text-muted-foreground",
        )}
        style={{ height: labelHeight }}
      >
        {pageNumber}
      </span>
    </div>
  );
}
