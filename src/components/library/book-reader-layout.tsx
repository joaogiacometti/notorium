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
import { linkAnnotationRenderer } from "@/components/library/book-reader-link-renderer";
import { ReaderNavHistoryProvider } from "@/components/library/book-reader-nav-history";
import { ReaderThumbnails } from "@/components/library/book-reader-thumbnails";
import { ReaderToolbar } from "@/components/library/book-reader-toolbar";
import { useReadingPosition } from "@/components/library/use-reading-position";

interface ReaderLayoutProps {
  documentId: string;
  bookId: string;
  title: string;
  initialPage: number;
}

// Rendered inside the EmbedPDF provider, so every child can reach the plugin
// hooks. GlobalPointerProvider (around the viewport) and the per-page
// PagePointerProvider feed pointer events to the interaction manager that drives
// text selection; RenderLayer paints each page at base resolution, TilingLayer
// overlays sharp tiles on zoom, SelectionLayer draws the selection, and
// AnnotationLayer renders the PDF's clickable LINK hotspots on top. The
// render/tiling layers set pointer-events:none so the gesture reaches the
// pointer provider instead of native-dragging the page image.
export function ReaderLayout({
  documentId,
  bookId,
  title,
  initialPage,
}: Readonly<ReaderLayoutProps>) {
  useReadingPosition({ documentId, bookId, initialPage });

  // h-full fills the fullscreen wrapper the provider auto-mounts around these
  // children; that wrapper (not this div) is the fullscreen target.
  // ReaderNavHistoryProvider wraps the toolbar and the page layer so a link
  // jump (recorded by the link hotspot) and the toolbar's back control share one
  // history stack.
  return (
    <ReaderNavHistoryProvider documentId={documentId}>
      <div className="flex h-full flex-col bg-background">
        <ReaderToolbar documentId={documentId} title={title} />
        <div className="flex min-h-0 flex-1">
          <ReaderThumbnails documentId={documentId} />
          {/* GlobalPointerProvider tracks pointermove/up across the viewport so a
              drag forms a text selection; its 100%-sized box needs this sized
              flex child as a definite parent. */}
          <div className="relative flex-1">
            <GlobalPointerProvider documentId={documentId}>
              <Viewport documentId={documentId} className="bg-muted/40">
                <Scroller
                  documentId={documentId}
                  renderPage={({ pageIndex }) => (
                    <PagePointerProvider
                      documentId={documentId}
                      pageIndex={pageIndex}
                      className="bg-background shadow-sm"
                    >
                      {/* pointer-events:none lets the drag fall through the page
                          image to the pointer provider instead of starting a
                          native image drag; SelectionLayer stays on top. */}
                      <RenderLayer
                        documentId={documentId}
                        pageIndex={pageIndex}
                        scale={1}
                        style={{ pointerEvents: "none" }}
                      />
                      <TilingLayer
                        documentId={documentId}
                        pageIndex={pageIndex}
                        style={{ pointerEvents: "none" }}
                      />
                      <SelectionLayer
                        documentId={documentId}
                        pageIndex={pageIndex}
                      />
                      {/* Drawn last so link hotspots sit on top. The layer fills
                          the page but stays pointer-transparent; only the LINK
                          overlays re-enable pointer events, so text selection
                          elsewhere is unaffected. */}
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
              </Viewport>
            </GlobalPointerProvider>
          </div>
        </div>
      </div>
    </ReaderNavHistoryProvider>
  );
}
