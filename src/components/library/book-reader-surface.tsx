"use client";

import { createPluginRegistration } from "@embedpdf/core";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import { LockModeType } from "@embedpdf/plugin-annotation";
import { AnnotationPluginPackage } from "@embedpdf/plugin-annotation/react";
import { BookmarkPluginPackage } from "@embedpdf/plugin-bookmark/react";
import { DocumentManagerPluginPackage } from "@embedpdf/plugin-document-manager/react";
import { FullscreenPluginPackage } from "@embedpdf/plugin-fullscreen/react";
import { InteractionManagerPluginPackage } from "@embedpdf/plugin-interaction-manager/react";
import { PanPluginPackage } from "@embedpdf/plugin-pan/react";
import { RenderPluginPackage } from "@embedpdf/plugin-render/react";
import { ScrollPluginPackage } from "@embedpdf/plugin-scroll/react";
import { SelectionPluginPackage } from "@embedpdf/plugin-selection/react";
import { SpreadPluginPackage } from "@embedpdf/plugin-spread/react";
import { ThumbnailPluginPackage } from "@embedpdf/plugin-thumbnail/react";
import { TilingPluginPackage } from "@embedpdf/plugin-tiling/react";
import { ViewportPluginPackage } from "@embedpdf/plugin-viewport/react";
import { ZoomMode } from "@embedpdf/plugin-zoom";
import { ZoomPluginPackage } from "@embedpdf/plugin-zoom/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { ReaderLayout } from "@/components/library/book-reader-layout";

export interface BookReaderProps {
  bookId: string;
  fileUrl: string;
  title: string;
  initialPage: number;
}

// EmbedPDF auto-mounts the fullscreen plugin's wrapper around its children,
// and that wrapper sizes itself to `height: 100%`. This fixed-height parent
// gives that wrapper (and the viewport beneath it) a definite height to fill;
// without it the viewport measures zero and gates its pages to a blank area.
export function BookReaderSurface(props: Readonly<BookReaderProps>) {
  return (
    <div className="h-svh">
      <ReaderEngine {...props} />
    </div>
  );
}

function ReaderEngine({
  bookId,
  fileUrl,
  title,
  initialPage,
}: Readonly<BookReaderProps>) {
  const { engine, isLoading, error } = usePdfiumEngine();

  // Memoized so the plugin registrations keep a stable identity across renders;
  // a new array would re-initialize the whole viewer (correctness, not perf).
  const plugins = useMemo(() => buildReaderPlugins(fileUrl), [fileUrl]);

  if (error)
    return <ReaderMessage>This book could not be loaded.</ReaderMessage>;
  if (isLoading || !engine) return <ReaderMessage>Loading book…</ReaderMessage>;

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      {({ activeDocumentId, activeDocument }) => {
        if (activeDocument?.status === "error") {
          return <ReaderMessage>This book could not be loaded.</ReaderMessage>;
        }
        // Gate on a fully loaded document: the zoom plugin's auto-fit recalc
        // queries spread pages on the first viewport resize and throws if the
        // document is still loading.
        if (!activeDocumentId || activeDocument?.status !== "loaded") {
          return <ReaderMessage>Loading book…</ReaderMessage>;
        }
        return (
          <ReaderLayout
            documentId={activeDocumentId}
            bookId={bookId}
            title={title}
            initialPage={initialPage}
          />
        );
      }}
    </EmbedPDF>
  );
}

// Registers the rendering pipeline (document/viewport/scroll/render/tiling) plus
// the interactive plugins the toolbar and sidebar drive. The pan plugin makes
// drag-to-scroll the default interaction mode on touch devices so a finger drag
// pans the page instead of starting a text selection; mouse devices keep
// selection as the default. The annotation plugin is registered in a fully
// locked mode so existing PDF annotations are not editable, while LINK
// annotations stay clickable: the plugin renders them with a pointer cursor and
// auto-mounts a navigation handler that opens URI links and scrolls to internal
// go-to targets. Annotation authoring stays out until the annotations feature
// lands.
function buildReaderPlugins(fileUrl: string) {
  return [
    createPluginRegistration(DocumentManagerPluginPackage, {
      initialDocuments: [{ url: fileUrl }],
    }),
    createPluginRegistration(ViewportPluginPackage),
    createPluginRegistration(ScrollPluginPackage),
    createPluginRegistration(RenderPluginPackage),
    createPluginRegistration(TilingPluginPackage),
    // Selection, pan, and the future annotation plugin require the
    // interaction-manager capability, so it must be registered before them.
    createPluginRegistration(InteractionManagerPluginPackage),
    // Pan becomes the default interaction mode only on touch devices, so a
    // finger drag scrolls the page instead of selecting text.
    createPluginRegistration(PanPluginPackage, { defaultMode: "mobile" }),
    // Selection renders the text layer over each page so the rasterized PDF
    // becomes selectable/copyable instead of an inert image.
    createPluginRegistration(SelectionPluginPackage),
    // Locked so the reader stays read-only; LINK annotations remain clickable.
    createPluginRegistration(AnnotationPluginPackage, {
      locked: { type: LockModeType.All },
    }),
    // FitPage so a book opens showing the whole page; FitWidth stretched small
    // page sizes to the viewport width, opening at an oversized zoom (~450%).
    createPluginRegistration(ZoomPluginPackage, {
      defaultZoomLevel: ZoomMode.FitPage,
    }),
    createPluginRegistration(SpreadPluginPackage),
    createPluginRegistration(FullscreenPluginPackage),
    // "instant" so re-opening the Pages sidebar snaps to the current page
    // instead of smooth-scrolling the thumbnail rail to it on every mount.
    createPluginRegistration(ThumbnailPluginPackage, {
      scrollBehavior: "instant",
    }),
    // Reads the document's embedded outline so the sidebar's Content view can
    // list the table of contents.
    createPluginRegistration(BookmarkPluginPackage),
  ];
}

function ReaderMessage({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
