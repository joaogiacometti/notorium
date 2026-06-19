"use client";

import { AnnotationLayer } from "@embedpdf/plugin-annotation/react";
import {
  GlobalPointerProvider,
  PagePointerProvider,
} from "@embedpdf/plugin-interaction-manager/react";
import { RenderLayer } from "@embedpdf/plugin-render/react";
import { Scroller } from "@embedpdf/plugin-scroll/react";
import { SelectionLayer } from "@embedpdf/plugin-selection/react";
import { TilingLayer } from "@embedpdf/plugin-tiling/react";
import { Viewport } from "@embedpdf/plugin-viewport/react";
import { ZoomGestureWrapper } from "@embedpdf/plugin-zoom/react";
import { linkAnnotationRenderer } from "@/components/library/book-reader-link-renderer";
import { ReaderNavHistoryProvider } from "@/components/library/book-reader-nav-history";
import { ReaderSelectionMenu } from "@/components/library/book-reader-selection-menu";
import { ReaderSidebar } from "@/components/library/book-reader-sidebar";
import { ReaderToolbar } from "@/components/library/book-reader-toolbar";
import { useReaderCopyShortcut } from "@/components/library/use-reader-copy-shortcut";
import { useReaderModeShortcuts } from "@/components/library/use-reader-mode-shortcuts";
import { useReaderSidebarCollapsed } from "@/components/library/use-reader-sidebar-collapsed";
import { useReadingPosition } from "@/components/library/use-reading-position";
import { cn } from "@/lib/utils";

interface ReaderLayoutProps {
  documentId: string;
  bookId: string;
  title: string;
  initialPage: number;
  readerColorInverted: boolean;
}

// Rendered inside the EmbedPDF provider, so every child can reach the plugin
// hooks. GlobalPointerProvider (around the viewport) and the per-page
// PagePointerProvider feed pointer events to the interaction manager that drives
// text selection; ZoomGestureWrapper wraps the Scroller to feed pinch and
// ctrl/cmd+wheel gestures to the zoom plugin. RenderLayer paints each page at
// base resolution, TilingLayer overlays sharp tiles on zoom, SelectionLayer
// draws the selection, and AnnotationLayer renders the PDF's clickable LINK
// hotspots on top. The render/tiling layers set pointer-events:none so the
// gesture reaches the pointer provider instead of native-dragging the page
// image.
export function ReaderLayout({
  documentId,
  bookId,
  title,
  initialPage,
  readerColorInverted,
}: Readonly<ReaderLayoutProps>) {
  useReadingPosition({ documentId, bookId, initialPage });
  useReaderCopyShortcut(documentId);
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } =
    useReaderSidebarCollapsed();
  useReaderModeShortcuts({ documentId, onToggleSidebar: toggleSidebar });

  // h-full fills the fullscreen wrapper the provider auto-mounts around these
  // children; that wrapper (not this div) is the fullscreen target.
  // ReaderNavHistoryProvider wraps the toolbar and the page layer so a link
  // jump (recorded by the link hotspot) and the toolbar's back control share one
  // history stack.
  return (
    <ReaderNavHistoryProvider documentId={documentId}>
      <div className="flex h-full flex-col bg-background">
        <ReaderToolbar
          documentId={documentId}
          title={title}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
        <div className="flex min-h-0 min-w-0 flex-1">
          <ReaderSidebar
            documentId={documentId}
            isCollapsed={sidebarCollapsed}
            readerColorInverted={readerColorInverted}
          />
          {/* GlobalPointerProvider tracks pointermove/up across the viewport so a
              drag forms a text selection; its 100%-sized box needs this sized
              flex child as a definite parent. select-none suppresses the
              browser's own text/range selection (user-select is inherited, so it
              cascades to every page): EmbedPDF selection is synthetic — it paints
              its own rectangles — so a native selection only interferes, dragging
              a ghost of the page image during pan and fighting the synthetic
              selection during a select drag. */}
          {/* min-w-0 + overflow-hidden keep this flex child from growing past
              the column when a page is wider than the viewport (zoomed in or a
              wide page): without min-w-0 a flex item's auto min-width refuses to
              shrink below its content, so the whole reader overflows sideways on
              mobile and you cannot pan back to the clipped edge. The Viewport
              owns its own internal scroll, so clipping here is safe. */}
          <div className="relative min-w-0 flex-1 select-none overflow-hidden">
            <GlobalPointerProvider documentId={documentId}>
              <Viewport documentId={documentId} className="bg-muted/40">
                {/* ZoomGestureWrapper wires pinch-to-zoom on touch and
                    ctrl/cmd+wheel zoom on desktop into the zoom plugin. */}
                <ZoomGestureWrapper documentId={documentId}>
                  <Scroller
                    documentId={documentId}
                    renderPage={({ pageIndex }) => (
                      <PagePointerProvider
                        documentId={documentId}
                        pageIndex={pageIndex}
                        className="bg-background shadow-sm"
                      >
                        {/* The render and tiling layers are wrapped so the
                            invert filter can be applied only to the PDF raster
                            content; SelectionLayer and AnnotationLayer stay
                            outside the wrapper and keep their normal colors. */}
                        <div
                          className={cn(
                            "absolute inset-0 pointer-events-none",
                            readerColorInverted && "reader-invert",
                          )}
                        >
                          {/* pointer-events:none lets the drag fall through the
                              page image to the pointer provider instead of
                              starting a native image drag; SelectionLayer stays
                              on top. */}
                          <RenderLayer
                            documentId={documentId}
                            pageIndex={pageIndex}
                            scale={1}
                            draggable={false}
                            style={{ pointerEvents: "none" }}
                          />
                          <TilingLayer
                            documentId={documentId}
                            pageIndex={pageIndex}
                            style={{ pointerEvents: "none" }}
                          />
                        </div>
                        <SelectionLayer
                          documentId={documentId}
                          pageIndex={pageIndex}
                        />
                        {/* Drawn last so link hotspots sit on top. The layer
                            fills the page but stays pointer-transparent; only
                            the LINK overlays re-enable pointer events, so text
                            selection elsewhere is unaffected. */}
                        <AnnotationLayer
                          documentId={documentId}
                          pageIndex={pageIndex}
                          annotationRenderers={[linkAnnotationRenderer]}
                          style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                          }}
                        />
                      </PagePointerProvider>
                    )}
                  />
                </ZoomGestureWrapper>
              </Viewport>
            </GlobalPointerProvider>
          </div>
        </div>
        <ReaderSelectionMenu documentId={documentId} />
      </div>
    </ReaderNavHistoryProvider>
  );
}
