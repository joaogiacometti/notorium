"use client";

import {
  AnnotationLayer,
  type AnnotationSelectionMenuProps,
} from "@embedpdf/plugin-annotation/react";
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
import { ReaderAnnotationMenu } from "@/components/library/book-reader-annotation-menu";
import { useReaderAnnotations } from "@/components/library/book-reader-annotations";
import { ReaderInteractionTools } from "@/components/library/book-reader-interaction-tools";
import { linkAnnotationRenderer } from "@/components/library/book-reader-link-renderer";
import { ReaderNavHistoryProvider } from "@/components/library/book-reader-nav-history";
import { ReaderSelectionMenu } from "@/components/library/book-reader-selection-menu";
import { ReaderSidebar } from "@/components/library/book-reader-sidebar";
import { ReaderSidebarToggle } from "@/components/library/book-reader-sidebar-toggle";
import { ReaderToolbar } from "@/components/library/book-reader-toolbar";
import { useReaderAnnotationShortcut } from "@/components/library/use-reader-annotation-shortcut";
import { useReaderCopyShortcut } from "@/components/library/use-reader-copy-shortcut";
import { useReaderDisplayShortcuts } from "@/components/library/use-reader-display-shortcuts";
import { useReaderModeShortcuts } from "@/components/library/use-reader-mode-shortcuts";
import { useReaderSidebarCollapsed } from "@/components/library/use-reader-sidebar-collapsed";
import { useReadingPosition } from "@/components/library/use-reading-position";
import type { BookAnnotationDto } from "@/features/library-annotations/types";
import type { DeckOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface ReaderLayoutProps {
  documentId: string;
  bookId: string;
  title: string;
  initialPage: number;
  readerColorInverted: boolean;
  initialAnnotations: BookAnnotationDto[];
  aiEnabled: boolean;
  decks: DeckOption[];
}

interface ReaderPageProps {
  documentId: string;
  pageIndex: number;
  readerColorInverted: boolean;
}

// Rendered inside the PagePointerProvider so child layers feed pointer events
// to the interaction manager for text selection. The render and tiling layers
// live inside a wrapper that applies an optional invert filter for dark mode;
// SelectionLayer and AnnotationLayer stay outside to keep their normal colors.
function ReaderPage({
  documentId,
  pageIndex,
  readerColorInverted,
}: Readonly<ReaderPageProps>) {
  return (
    <PagePointerProvider
      documentId={documentId}
      pageIndex={pageIndex}
      className="bg-background shadow-sm"
    >
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          readerColorInverted && "reader-invert",
        )}
      >
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
      <SelectionLayer documentId={documentId} pageIndex={pageIndex} />
      <AnnotationLayer
        documentId={documentId}
        pageIndex={pageIndex}
        annotationRenderers={[linkAnnotationRenderer]}
        selectionMenu={createSelectionMenuRenderer(documentId)}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
    </PagePointerProvider>
  );
}

// Thin adapters for EmbedPDF render props so the Scroller's renderPage and
// AnnotationLayer's selectionMenu don't create inline components inside
// ReaderLayout (SonarQube S6478). Each closes over the stable values once at
// module level instead of re-creating a component identity on every render.
function createPageRenderer(documentId: string, readerColorInverted: boolean) {
  return function renderPage({ pageIndex }: { pageIndex: number }) {
    return (
      <ReaderPage
        documentId={documentId}
        pageIndex={pageIndex}
        readerColorInverted={readerColorInverted}
      />
    );
  };
}

function createSelectionMenuRenderer(documentId: string) {
  return function renderSelectionMenu(menuProps: AnnotationSelectionMenuProps) {
    return <ReaderAnnotationMenu {...menuProps} documentId={documentId} />;
  };
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
  initialAnnotations,
  aiEnabled,
  decks,
}: Readonly<ReaderLayoutProps>) {
  useReadingPosition({ documentId, bookId, initialPage });
  useReaderAnnotations({ documentId, bookId, initialAnnotations });
  useReaderAnnotationShortcut(documentId);
  useReaderCopyShortcut(documentId);
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } =
    useReaderSidebarCollapsed();
  useReaderModeShortcuts({ documentId, onToggleSidebar: toggleSidebar });
  useReaderDisplayShortcuts({ documentId });

  return (
    <ReaderNavHistoryProvider documentId={documentId}>
      <div className="flex h-full flex-col bg-background">
        <ReaderToolbar documentId={documentId} title={title} />
        <div className="flex min-h-0 min-w-0 flex-1">
          <ReaderSidebar
            documentId={documentId}
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
                    renderPage={createPageRenderer(
                      documentId,
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
          decks={decks}
        />
      </div>
    </ReaderNavHistoryProvider>
  );
}
