"use client";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { savePdfReadingPage } from "@/app/actions/pdfs";
import {
  actualSizeRatio,
  cropPageSize,
  PDF_FIT_WIDTH,
  PDF_NARROW_COLUMN_PX,
  PDF_NO_CROP,
  PDF_PAGE_GAP_PX,
  type PdfCrop,
  type PdfPageSize,
  type PdfZoom,
  pageRenderPixelRatio,
  readerColumnPadding,
  resolvePageWidth,
} from "@/components/pdfs/pdf-page-layout";
import { PdfReaderToolbar } from "@/components/pdfs/pdf-reader-toolbar";
import { measurePdfTextCrop } from "@/components/pdfs/pdf-text-crop";
import { usePdfGestureZoom } from "@/components/pdfs/use-pdf-gesture-zoom";
import { usePdfReadingProgress } from "@/components/pdfs/use-pdf-reading-progress";
import {
  type PdfScrollLayout,
  usePdfScrollLayout,
} from "@/components/pdfs/use-pdf-scroll-layout";
import { usePdfStudyContext } from "@/components/pdfs/use-pdf-study-context";
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

interface PdfReaderProps {
  pdfId: string;
  title: string;
  subjectPath: string;
  fileUrl: string;
  initialPage: number;
}

/**
 * A continuous, vertically scrolling PDF reader that fits pages to the
 * column width by default, zooms with buttons, pinch, or Ctrl/⌘ + wheel, renders only
 * the pages near the viewport, remembers the page being read, and offers
 * the selected or visible text to the study assistant.
 *
 * @example
 * <PdfReader pdfId={pdf.id} title={pdf.title} subjectPath={subjectName} fileUrl={url} initialPage={pdf.lastPage} />
 */
export function PdfReader({
  pdfId,
  title,
  subjectPath,
  fileUrl,
  initialPage,
}: Readonly<PdfReaderProps>) {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [opened, setOpened] = useState<OpenedPdf | null>(null);
  const [failed, setFailed] = useState(false);
  const navigationRef = useRef<PdfScrollLayout>(null);

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
      onItemClick={({ pageNumber }) =>
        navigationRef.current?.followPageLink(pageNumber)
      }
      externalLinkTarget="_blank"
      externalLinkRel="noopener noreferrer nofollow"
      loading={<PdfColumnSkeleton />}
      error={null}
      className="flex min-h-0 flex-1 flex-col gap-2"
    >
      {opened ? (
        <PdfPageColumn
          navigationRef={navigationRef}
          pdfId={pdfId}
          title={title}
          subjectPath={subjectPath}
          pdfDocument={opened.pdfDocument}
          pageCount={opened.pageCount}
          initialPage={opened.initialPage}
          basePage={opened.basePage}
          textCrop={opened.textCrop}
        />
      ) : (
        <PdfColumnSkeleton />
      )}
    </Document>
  );
}

interface OpenedPdf {
  pdfDocument: PDFDocumentProxy;
  pageCount: number;
  initialPage: number;
  /** The opening page's size, assumed for pages that have not loaded yet. */
  basePage: PdfPageSize;
  /** The text column of the opening pages; null when there is nothing to trim. */
  textCrop: PdfCrop | null;
}

interface PdfPageColumnProps extends OpenedPdf {
  navigationRef: RefObject<PdfScrollLayout | null>;
  pdfId: string;
  title: string;
  subjectPath: string;
}

function PdfPageColumn({
  navigationRef,
  pdfId,
  title,
  subjectPath,
  pdfDocument,
  pageCount,
  initialPage,
  basePage,
  textCrop,
}: Readonly<PdfPageColumnProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<PdfZoom>(PDF_FIT_WIDTH);
  // Null follows the screen: phones trim margins, wider screens do not.
  const [trimMargins, setTrimMargins] = useState<boolean | null>(null);
  const [pageAspects, setPageAspects] = useState<ReadonlyMap<number, number>>(
    () => new Map(),
  );
  const column = useElementSize(scrollRef);
  const padding = readerColumnPadding(column.width);
  const trimmed = trimMargins ?? column.width < PDF_NARROW_COLUMN_PX;
  const crop = (trimmed ? textCrop : null) ?? PDF_NO_CROP;
  const visiblePage = cropPageSize(basePage, crop);
  // The slot shows the visible part; the page renders wider behind it.
  const pageWidth = resolvePageWidth(
    zoom,
    { columnWidth: column.width, columnHeight: column.height, padding },
    visiblePage,
  );
  const renderWidth = pageWidth / crop.width;
  const zoomRatio = actualSizeRatio(pageWidth, visiblePage);
  const pageHeights = buildPageHeights(
    renderWidth,
    pageCount,
    pageAspects,
    basePage.height / basePage.width,
  );
  const layout = usePdfScrollLayout({ scrollRef, pageHeights, initialPage });
  useImperativeHandle(navigationRef, () => layout);

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
  usePdfStudyContext({
    pdf: { id: pdfId, title },
    subjectPath,
    pdfDocument,
    currentPage: layout.currentPage,
    pagesRef: contentRef,
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
        canGoBack={layout.canGoBack}
        onGoBack={layout.goBack}
        trimMargins={textCrop !== null && trimmed}
        canTrimMargins={textCrop !== null}
        onTrimMarginsChange={setTrimMargins}
      />
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto rounded-md bg-muted/40"
      >
        <div
          ref={contentRef}
          className="flex w-fit min-w-full origin-top flex-col items-center"
          style={{ gap: PDF_PAGE_GAP_PX, padding }}
        >
          {pageHeights.map((height, index) => {
            const pageNumber = index + 1;
            return (
              <PdfPageSlot
                key={`page-${pageNumber}`}
                pageNumber={pageNumber}
                width={pageWidth}
                renderWidth={renderWidth}
                cropLeft={crop.left * renderWidth}
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
  /** The visible slot width; the page renders at `renderWidth` behind it. */
  width: number;
  renderWidth: number;
  /** How far the page shifts left so its trimmed margin sits outside the slot. */
  cropLeft: number;
  height: number;
  rendered: boolean;
  onAspect: (pageNumber: number, aspect: number) => void;
}

// A fixed-size slot keeps the scroll height stable whether or not the page is
// rendered, so only pages near the viewport hold canvases.
function PdfPageSlot({
  pageNumber,
  width,
  renderWidth,
  cropLeft,
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
        <div
          className="h-full"
          style={{ width: renderWidth, marginLeft: -cropLeft }}
        >
          <Page
            pageNumber={pageNumber}
            width={renderWidth}
            // react-pdf suspends by default; a page suspending would hide the
            // whole column through the dynamic-import boundary, which collapses
            // it and resets the scroll position to the top.
            suspense={false}
            className="size-full"
            devicePixelRatio={pageRenderPixelRatio(
              renderWidth,
              height,
              window.devicePixelRatio,
            )}
            renderAnnotationLayer
            loading={placeholder}
            onLoadSuccess={(page) =>
              onAspect(pageNumber, page.originalHeight / page.originalWidth)
            }
          />
        </div>
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
    pdfDocument: document,
    pageCount: document.numPages,
    initialPage,
    basePage: await readPageSize(document, initialPage),
    textCrop: await readTextCrop(document, initialPage),
  };
}

// Trimming is an enhancement: a page that fails to measure opens untrimmed.
async function readTextCrop(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<PdfCrop | null> {
  try {
    return await measurePdfTextCrop(document, pageNumber);
  } catch {
    return null;
  }
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
