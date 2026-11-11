"use client";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import {
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PageCallback } from "react-pdf/dist/shared/types.js";
import { savePdfReadingPage } from "@/app/actions/pdfs";
import { type OpenedPdf, openPdfAt } from "@/components/pdfs/pdf-opening";
import {
  actualSizeRatio,
  buildPageSlots,
  cropPageSize,
  PDF_FIT_WIDTH,
  PDF_NARROW_COLUMN_PX,
  PDF_NO_CROP,
  PDF_PAGE_GAP_PX,
  PDF_RENDER_WINDOW_PAGES,
  type PdfCrop,
  type PdfRows,
  type PdfZoom,
  pageRenderPixelRatio,
  readerColumnPadding,
  resolvePageWidth,
} from "@/components/pdfs/pdf-page-layout";
import { PdfReaderToolbar } from "@/components/pdfs/pdf-reader-toolbar";
import { PdfSelectionActions } from "@/components/pdfs/pdf-selection-actions";
import { PdfTableOfContents } from "@/components/pdfs/pdf-table-of-contents";
import { measurePdfPageRows } from "@/components/pdfs/pdf-text-crop";
import { usePdfGestureZoom } from "@/components/pdfs/use-pdf-gesture-zoom";
import { usePdfPageTint } from "@/components/pdfs/use-pdf-page-tint";
import { usePdfReadingChrome } from "@/components/pdfs/use-pdf-reading-chrome";
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
const NO_PAGE_ROWS: ReadonlyMap<number, PdfRows> = new Map();

interface PdfReaderProps {
  pdfId: string;
  title: string;
  folderPath: string;
  fileUrl: string;
  initialPage: number;
  /** Zen mode: the controls can leave on any screen, not only on phones. */
  immersive: boolean;
  /** Whether the reading controls are out of the way. */
  chromeHidden: boolean;
  onChromeHiddenChange: (hidden: boolean) => void;
}

/**
 * A continuous, vertically scrolling PDF reader that fits pages to the
 * column width by default, zooms with buttons, pinch, or Ctrl/⌘ + wheel, renders only
 * the pages near the viewport, remembers the page being read, and offers
 * the selected or visible text to the study assistant. On phones and in zen
 * mode it asks its host to hide the controls while the reader moves down the pages.
 *
 * @example
 * <PdfReader pdfId={pdf.id} title={pdf.title} folderPath={folderName} fileUrl={url} initialPage={pdf.lastPage} immersive={isZenMode} chromeHidden={hidden} onChromeHiddenChange={setHidden} />
 */
export function PdfReader({
  pdfId,
  title,
  folderPath,
  fileUrl,
  initialPage,
  immersive,
  chromeHidden,
  onChromeHiddenChange,
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
          folderPath={folderPath}
          pdfDocument={opened.pdfDocument}
          pageCount={opened.pageCount}
          initialPage={opened.initialPage}
          basePage={opened.basePage}
          textCrop={opened.textCrop}
          immersive={immersive}
          chromeHidden={chromeHidden}
          onChromeHiddenChange={onChromeHiddenChange}
        />
      ) : (
        <PdfColumnSkeleton />
      )}
    </Document>
  );
}

interface PdfPageColumnProps extends OpenedPdf {
  navigationRef: RefObject<PdfScrollLayout | null>;
  pdfId: string;
  title: string;
  folderPath: string;
  immersive: boolean;
  chromeHidden: boolean;
  onChromeHiddenChange: (hidden: boolean) => void;
}

function PdfPageColumn({
  navigationRef,
  pdfId,
  title,
  folderPath,
  pdfDocument,
  pageCount,
  initialPage,
  basePage,
  textCrop,
  immersive,
  chromeHidden,
  onChromeHiddenChange,
}: Readonly<PdfPageColumnProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<PdfZoom>(PDF_FIT_WIDTH);
  const [contentsOpen, setContentsOpen] = useState(false);
  const contentsToggleRef = useRef<HTMLButtonElement>(null);
  // Null follows the screen: phones trim margins, wider screens do not.
  const [trimMargins, setTrimMargins] = useState<boolean | null>(null);
  const [pageAspects, setPageAspects] = useState<ReadonlyMap<number, number>>(
    () => new Map(),
  );
  // Rows of loaded pages whose own text reaches outside the shared crop.
  const [pageRows, setPageRows] = useState<ReadonlyMap<number, PdfRows>>(
    () => new Map(),
  );
  const [pageTint, setPageTint] = usePdfPageTint();
  const column = useElementSize(scrollRef);
  const padding = readerColumnPadding(column.width);
  const narrow = column.width < PDF_NARROW_COLUMN_PX;
  const trimmed = textCrop !== null && (trimMargins ?? narrow);
  const crop: PdfCrop = trimmed ? textCrop.crop : PDF_NO_CROP;
  const visiblePage = cropPageSize(basePage, crop);
  // The slot shows the visible part; the page renders wider behind it.
  const pageWidth = resolvePageWidth(
    zoom,
    { columnWidth: column.width, columnHeight: column.height, padding },
    visiblePage,
  );
  const renderWidth = pageWidth / crop.width;
  const zoomRatio = actualSizeRatio(pageWidth, visiblePage);
  const slots = buildPageSlots(renderWidth, pageCount, {
    baseAspect: basePage.height / basePage.width,
    aspects: pageAspects,
    baseRows: crop,
    rows: trimmed ? pageRows : NO_PAGE_ROWS,
  });
  const pageHeights = slots.map((slot) => slot.height);
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

  // Likewise, only a page whose text leaves the shared rows changes the layout.
  // Measuring is an enhancement: a page that fails keeps the shared rows.
  async function recordPageRows(pageNumber: number, page: PageCallback) {
    if (!textCrop) return;
    const shared = textCrop.crop;
    const rows = await measurePdfPageRows(page, textCrop).catch(() => null);
    if (!rows) return;
    setPageRows((current) => {
      const assumed = current.get(pageNumber) ?? shared;
      return assumed.top === rows.top && assumed.height === rows.height
        ? current
        : new Map(current).set(pageNumber, rows);
    });
  }

  function handlePageLoad(pageNumber: number, page: PageCallback) {
    recordPageAspect(pageNumber, page.originalHeight / page.originalWidth);
    void recordPageRows(pageNumber, page);
  }

  usePdfGestureZoom({
    scrollRef,
    contentRef,
    zoom: zoomRatio,
    onZoomCommit: (ratio) => setZoom({ kind: "ratio", ratio }),
  });
  usePdfReadingChrome({
    scrollRef,
    // The contents tray is closed from the controls, so they stay with it.
    enabled: (narrow || immersive) && !contentsOpen,
    hidden: chromeHidden,
    onHiddenChange: onChromeHiddenChange,
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
    folderPath,
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
        contentsOpen={contentsOpen}
        contentsToggleRef={contentsToggleRef}
        onToggleContents={() => setContentsOpen((open) => !open)}
        trimMargins={trimmed}
        canTrimMargins={textCrop !== null}
        onTrimMarginsChange={setTrimMargins}
        pageTint={pageTint}
        onPageTintChange={setPageTint}
        hidden={chromeHidden ? chromeHideScope(immersive) : undefined}
      />
      <PdfSelectionActions pagesRef={contentRef} />
      <div className="flex min-h-0 flex-1 flex-col gap-2 sm:flex-row">
        {contentsOpen && (
          <aside
            aria-label="Table of contents"
            className="flex min-h-0 max-h-1/2 w-full shrink-0 px-2 sm:max-h-none sm:w-64 sm:max-w-1/2 sm:px-0"
          >
            <PdfTableOfContents
              pdfDocument={pdfDocument}
              onNavigate={(page) => navigationRef.current?.followPageLink(page)}
            />
          </aside>
        )}
        <div
          ref={scrollRef}
          className="min-h-0 min-w-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain bg-muted/40 sm:rounded-md"
        >
          <div
            ref={contentRef}
            data-pdf-page-tint={pageTint}
            className="flex w-fit min-w-full origin-top flex-col items-center"
            style={{ gap: PDF_PAGE_GAP_PX, padding }}
          >
            {slots.map((slot, index) => {
              const pageNumber = index + 1;
              return (
                <PdfPageSlot
                  key={`page-${pageNumber}`}
                  pageNumber={pageNumber}
                  width={pageWidth}
                  renderWidth={renderWidth}
                  cropLeft={crop.left * renderWidth}
                  cropTop={slot.cropTop}
                  height={slot.height}
                  renderHeight={slot.fullHeight}
                  rendered={
                    Math.abs(pageNumber - layout.currentPage) <=
                    PDF_RENDER_WINDOW_PAGES
                  }
                  onLoad={handlePageLoad}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function chromeHideScope(immersive: boolean) {
  return immersive ? "everywhere" : "phones";
}

interface PdfPageSlotProps {
  pageNumber: number;
  /** The visible slot width; the page renders at `renderWidth` behind it. */
  width: number;
  renderWidth: number;
  /** How far the page shifts so its trimmed margins sit outside the slot. */
  cropLeft: number;
  cropTop: number;
  /** The visible slot height; the page renders at `renderHeight` behind it. */
  height: number;
  renderHeight: number;
  rendered: boolean;
  onLoad: (pageNumber: number, page: PageCallback) => void;
}

// A fixed-size slot keeps the scroll height stable whether or not the page is
// rendered, so only pages near the viewport hold canvases.
function PdfPageSlot({
  pageNumber,
  width,
  renderWidth,
  cropLeft,
  cropTop,
  height,
  renderHeight,
  rendered,
  onLoad,
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
          style={{
            width: renderWidth,
            height: renderHeight,
            marginLeft: -cropLeft,
            marginTop: -cropTop,
          }}
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
              renderHeight,
              window.devicePixelRatio,
            )}
            renderAnnotationLayer
            loading={placeholder}
            onLoadSuccess={(page) => onLoad(pageNumber, page)}
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
    <div
      data-pdf-page-placeholder
      className="absolute inset-0 flex items-center justify-center bg-card text-sm text-muted-foreground tabular-nums"
    >
      {pageNumber}
    </div>
  );
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
      <Skeleton className="order-last h-14 w-full rounded-md sm:order-first sm:h-9" />
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
