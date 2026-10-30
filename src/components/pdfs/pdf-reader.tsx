"use client";

import "react-pdf/dist/Page/TextLayer.css";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { savePdfReadingPage } from "@/app/actions/pdfs";
import {
  actualSizeRatio,
  PDF_FIT_PAGE,
  PDF_PAGE_GAP_PX,
  type PdfPageSize,
  type PdfZoom,
  pageRenderPixelRatio,
  resolvePageWidth,
} from "@/components/pdfs/pdf-page-layout";
import { PdfReaderToolbar } from "@/components/pdfs/pdf-reader-toolbar";
import { usePdfGestureZoom } from "@/components/pdfs/use-pdf-gesture-zoom";
import { usePdfReadingProgress } from "@/components/pdfs/use-pdf-reading-progress";
import { usePdfScrollLayout } from "@/components/pdfs/use-pdf-scroll-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// react-pdf requires the worker to be configured in the module that renders
// <Document>, or its default can overwrite this value.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Load only the byte ranges of the pages being viewed: no background prefetch
// of the whole file and no streaming of it on the first request.
const PDF_LOAD_OPTIONS = {
  disableAutoFetch: true,
  disableStream: true,
  rangeChunkSize: 512 * 1024,
};
const A4_POINTS: PdfPageSize = { width: 595, height: 842 };
const RENDER_WINDOW_PAGES = 2;
const COLUMN_PADDING_PX = 16;

interface PdfReaderProps {
  pdfId: string;
  fileUrl: string;
  initialPage: number;
}

/**
 * A continuous, vertically scrolling PDF reader that fits a whole page to
 * the column by default, zooms with buttons, pinch, or Ctrl/⌘ + wheel, renders only
 * the pages near the viewport, and remembers the page being read.
 *
 * @example
 * <PdfReader pdfId={pdf.id} fileUrl={url} initialPage={pdf.lastPage} />
 */
export function PdfReader({
  pdfId,
  fileUrl,
  initialPage,
}: Readonly<PdfReaderProps>) {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [opened, setOpened] = useState<OpenedPdf | null>(null);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <PdfLoadError
        onRetry={() => {
          setFailed(false);
          setLoadAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  return (
    <Document
      key={loadAttempt}
      file={fileUrl}
      suspense={false}
      options={PDF_LOAD_OPTIONS}
      onLoadSuccess={async (document) =>
        setOpened(await openPdfAt(document, initialPage))
      }
      onLoadError={() => setFailed(true)}
      loading={<PdfColumnSkeleton />}
      error={null}
      className="flex min-h-0 flex-1 flex-col gap-2"
    >
      {opened ? (
        <PdfPageColumn
          pdfId={pdfId}
          pageCount={opened.pageCount}
          initialPage={opened.initialPage}
          basePage={opened.basePage}
        />
      ) : (
        <PdfColumnSkeleton />
      )}
    </Document>
  );
}

interface OpenedPdf {
  pageCount: number;
  initialPage: number;
  /** The opening page's size, assumed for pages that have not loaded yet. */
  basePage: PdfPageSize;
}

interface PdfPageColumnProps extends OpenedPdf {
  pdfId: string;
}

function PdfPageColumn({
  pdfId,
  pageCount,
  initialPage,
  basePage,
}: Readonly<PdfPageColumnProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<PdfZoom>(PDF_FIT_PAGE);
  const [pageAspects, setPageAspects] = useState<ReadonlyMap<number, number>>(
    () => new Map(),
  );
  const column = useElementSize(scrollRef);
  const pageWidth = resolvePageWidth(
    zoom,
    {
      columnWidth: column.width,
      columnHeight: column.height,
      padding: COLUMN_PADDING_PX,
    },
    basePage,
  );
  const zoomRatio = actualSizeRatio(pageWidth, basePage);
  const pageHeights = buildPageHeights(
    pageWidth,
    pageCount,
    pageAspects,
    basePage.height / basePage.width,
  );
  const layout = usePdfScrollLayout({ scrollRef, pageHeights, initialPage });

  // Most PDFs repeat one page shape, so a page matching the assumed shape
  // must not trigger a column-wide re-layout when it loads.
  function recordPageAspect(pageNumber: number, aspect: number) {
    const assumed =
      pageAspects.get(pageNumber) ?? basePage.height / basePage.width;
    if (assumed === aspect) return;
    setPageAspects((current) => new Map(current).set(pageNumber, aspect));
  }

  usePdfGestureZoom({
    scrollRef,
    contentRef,
    zoom: zoomRatio,
    onZoomCommit: (ratio) => setZoom({ kind: "ratio", ratio }),
  });
  usePdfReadingProgress({
    pdfId,
    page: layout.currentPage,
    pageCount,
    initialPage,
    save: savePdfReadingPage,
  });

  return (
    <>
      <PdfReaderToolbar
        currentPage={layout.currentPage}
        pageCount={pageCount}
        zoom={zoom}
        zoomRatio={zoomRatio}
        onZoomChange={setZoom}
        onPageJump={layout.scrollToPage}
      />
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto rounded-md bg-muted/40"
      >
        <div
          ref={contentRef}
          className="flex w-fit min-w-full origin-top flex-col items-center"
          style={{ gap: PDF_PAGE_GAP_PX, padding: COLUMN_PADDING_PX }}
        >
          {pageHeights.map((height, index) => {
            const pageNumber = index + 1;
            return (
              <PdfPageSlot
                key={`page-${pageNumber}`}
                pageNumber={pageNumber}
                width={pageWidth}
                height={height}
                rendered={
                  Math.abs(pageNumber - layout.currentPage) <=
                  RENDER_WINDOW_PAGES
                }
                onAspect={recordPageAspect}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

interface PdfPageSlotProps {
  pageNumber: number;
  width: number;
  height: number;
  rendered: boolean;
  onAspect: (pageNumber: number, aspect: number) => void;
}

// A fixed-size slot keeps the scroll height stable whether or not the page is
// rendered, so only pages near the viewport hold canvases.
function PdfPageSlot({
  pageNumber,
  width,
  height,
  rendered,
  onAspect,
}: Readonly<PdfPageSlotProps>) {
  const placeholder = <PdfPagePlaceholder pageNumber={pageNumber} />;
  return (
    <div
      data-page-number={pageNumber}
      className="relative shrink-0 overflow-hidden rounded-sm"
      style={{ width, height }}
    >
      {rendered ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          // react-pdf suspends by default; a page suspending would hide the
          // whole column through the dynamic-import boundary, which collapses
          // it and resets the scroll position to the top.
          suspense={false}
          className="size-full"
          devicePixelRatio={pageRenderPixelRatio(
            width,
            height,
            window.devicePixelRatio,
          )}
          renderAnnotationLayer={false}
          loading={placeholder}
          onLoadSuccess={(page) =>
            onAspect(pageNumber, page.originalHeight / page.originalWidth)
          }
        />
      ) : (
        placeholder
      )}
    </div>
  );
}

function PdfPagePlaceholder({ pageNumber }: Readonly<{ pageNumber: number }>) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-card text-sm text-muted-foreground tabular-nums">
      {pageNumber}
    </div>
  );
}

function buildPageHeights(
  pageWidth: number,
  pageCount: number,
  pageAspects: ReadonlyMap<number, number>,
  baseAspect: number,
): number[] {
  if (pageWidth <= 0) return [];
  return Array.from(
    { length: pageCount },
    (_, index) => pageWidth * (pageAspects.get(index + 1) ?? baseAspect),
  );
}

/** Page count, clamped opening page, and the opening page's size. */
async function openPdfAt(
  document: PDFDocumentProxy,
  savedPage: number,
): Promise<OpenedPdf> {
  const initialPage = Math.min(Math.max(1, savedPage), document.numPages);
  return {
    pageCount: document.numPages,
    initialPage,
    basePage: await readPageSize(document, initialPage),
  };
}

// Measuring a real page before the first layout keeps placeholder heights
// right, so pages loading in later rarely resize and shift the column.
async function readPageSize(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<PdfPageSize> {
  try {
    const viewport = (await document.getPage(pageNumber)).getViewport({
      scale: 1,
    });
    return { width: viewport.width, height: viewport.height };
  } catch {
    return A4_POINTS;
  }
}

function useElementSize(ref: RefObject<HTMLElement | null>): {
  width: number;
  height: number;
} {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function PdfColumnSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="min-h-0 flex-1 rounded-md" />
    </div>
  );
}

function PdfLoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div
      role="alert"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground"
    >
      Couldn't load this PDF.
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
