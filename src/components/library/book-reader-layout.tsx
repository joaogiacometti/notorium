"use client";

import { GlobalPointerProvider } from "@embedpdf/plugin-interaction-manager/react";
import { Scroller } from "@embedpdf/plugin-scroll/react";
import { Viewport } from "@embedpdf/plugin-viewport/react";
import { ZoomGestureWrapper } from "@embedpdf/plugin-zoom/react";
import { ReaderInteractionTools } from "@/components/library/book-reader-interaction-tools";
import { ReaderNavHistoryProvider } from "@/components/library/book-reader-nav-history";
import { createReaderPageRenderer } from "@/components/library/book-reader-page-layers";
import { ReaderSelectionMenu } from "@/components/library/book-reader-selection-menu";
import { ReaderSidebar } from "@/components/library/book-reader-sidebar";
import { ReaderSidebarToggle } from "@/components/library/book-reader-sidebar-toggle";
import { ReaderToolbar } from "@/components/library/book-reader-toolbar";
import { useReaderSession } from "@/components/library/use-reader-session";
import type { BookAnnotationDto } from "@/features/library-annotations/types";
import type { SubjectOption } from "@/lib/server/api-contracts";

interface ReaderLayoutProps {
  documentId: string;
  bookId: string;
  title: string;
  initialPage: number;
  initialZoomMobile: string | null;
  initialZoomDesktop: string | null;
  readerColorInverted: boolean;
  initialAnnotations: BookAnnotationDto[];
  aiEnabled: boolean;
  subjects: SubjectOption[];
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
  initialZoomMobile,
  initialZoomDesktop,
  readerColorInverted,
  initialAnnotations,
  aiEnabled,
  subjects,
}: Readonly<ReaderLayoutProps>) {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } =
    useReaderSession({
      documentId,
      bookId,
      initialPage,
      initialAnnotations,
      initialZoomMobile,
      initialZoomDesktop,
    });

  return (
    <ReaderNavHistoryProvider documentId={documentId}>
      <div className="flex h-full flex-col bg-background">
        <ReaderToolbar documentId={documentId} title={title} />
        <div className="flex min-h-0 min-w-0 flex-1">
          <ReaderSidebar
            documentId={documentId}
            initialAnnotations={initialAnnotations}
            isCollapsed={sidebarCollapsed}
            readerColorInverted={readerColorInverted}
          />
          <div className="relative min-w-0 flex-1 select-none overflow-hidden">
            <ReaderSidebarToggle
              isCollapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
            />
            <ReaderInteractionTools documentId={documentId} />
            <GlobalPointerProvider documentId={documentId}>
              <Viewport documentId={documentId} className="bg-muted/40">
                <ZoomGestureWrapper documentId={documentId}>
                  <Scroller
                    documentId={documentId}
                    renderPage={createReaderPageRenderer(
                      documentId,
                      bookId,
                      readerColorInverted,
                    )}
                  />
                </ZoomGestureWrapper>
              </Viewport>
            </GlobalPointerProvider>
          </div>
        </div>
        <ReaderSelectionMenu
          documentId={documentId}
          aiEnabled={aiEnabled}
          subjects={subjects}
        />
      </div>
    </ReaderNavHistoryProvider>
  );
}
