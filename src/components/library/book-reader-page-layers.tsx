"use client";

import {
  AnnotationLayer,
  type AnnotationSelectionMenuProps,
} from "@embedpdf/plugin-annotation/react";
import { PagePointerProvider } from "@embedpdf/plugin-interaction-manager/react";
import { RenderLayer } from "@embedpdf/plugin-render/react";
import { SearchLayer } from "@embedpdf/plugin-search/react";
import { SelectionLayer } from "@embedpdf/plugin-selection/react";
import { TilingLayer } from "@embedpdf/plugin-tiling/react";
import { ReaderAnnotationMenu } from "@/components/library/book-reader-annotation-menu";
import { linkAnnotationRenderer } from "@/components/library/book-reader-link-renderer";
import { cn } from "@/lib/utils";

interface ReaderPageLayersProps {
  documentId: string;
  bookId: string;
  pageIndex: number;
  readerColorInverted: boolean;
}

/**
 * Renders one PDF page plus the interaction layers EmbedPDF expects.
 *
 * @example
 * <ReaderPageLayers documentId={documentId} bookId={bookId} pageIndex={0} readerColorInverted={false} />
 */
export function ReaderPageLayers({
  documentId,
  bookId,
  pageIndex,
  readerColorInverted,
}: Readonly<ReaderPageLayersProps>) {
  return (
    <PagePointerProvider
      documentId={documentId}
      pageIndex={pageIndex}
      className="bg-background shadow-sm"
    >
      <PdfRasterLayers
        documentId={documentId}
        pageIndex={pageIndex}
        readerColorInverted={readerColorInverted}
      />
      <PdfInteractionLayers
        documentId={documentId}
        bookId={bookId}
        pageIndex={pageIndex}
      />
    </PagePointerProvider>
  );
}

interface PdfInteractionLayersProps {
  documentId: string;
  bookId: string;
  pageIndex: number;
}

function PdfInteractionLayers({
  documentId,
  bookId,
  pageIndex,
}: Readonly<PdfInteractionLayersProps>) {
  return (
    <>
      <SelectionLayer documentId={documentId} pageIndex={pageIndex} />
      <SearchLayer
        documentId={documentId}
        pageIndex={pageIndex}
        highlightColor="var(--intent-warning-bg)"
        activeHighlightColor="var(--intent-warning-fill)"
        style={{ position: "absolute", inset: 0 }}
      />
      <AnnotationLayer
        documentId={documentId}
        pageIndex={pageIndex}
        annotationRenderers={[linkAnnotationRenderer]}
        selectionMenu={createSelectionMenuRenderer(documentId, bookId)}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
    </>
  );
}

/**
 * Builds the stable page renderer passed to EmbedPDF's Scroller.
 *
 * @example
 * <Scroller documentId={documentId} renderPage={createReaderPageRenderer(documentId, bookId, false)} />
 */
export function createReaderPageRenderer(
  documentId: string,
  bookId: string,
  readerColorInverted: boolean,
) {
  return function renderPage({ pageIndex }: { pageIndex: number }) {
    return (
      <ReaderPageLayers
        documentId={documentId}
        bookId={bookId}
        pageIndex={pageIndex}
        readerColorInverted={readerColorInverted}
      />
    );
  };
}

interface PdfRasterLayersProps {
  documentId: string;
  pageIndex: number;
  readerColorInverted: boolean;
}

function PdfRasterLayers({
  documentId,
  pageIndex,
  readerColorInverted,
}: Readonly<PdfRasterLayersProps>) {
  return (
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
  );
}

function createSelectionMenuRenderer(documentId: string, bookId: string) {
  return function renderSelectionMenu(menuProps: AnnotationSelectionMenuProps) {
    return (
      <ReaderAnnotationMenu
        {...menuProps}
        documentId={documentId}
        bookId={bookId}
      />
    );
  };
}
