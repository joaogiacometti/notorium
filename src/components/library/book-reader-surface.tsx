"use client";

import { createPluginRegistration } from "@embedpdf/core";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import { LockModeType } from "@embedpdf/plugin-annotation";
import { AnnotationPluginPackage } from "@embedpdf/plugin-annotation/react";
import { BookmarkPluginPackage } from "@embedpdf/plugin-bookmark/react";
import { DocumentManagerPluginPackage } from "@embedpdf/plugin-document-manager/react";
import { InteractionManagerPluginPackage } from "@embedpdf/plugin-interaction-manager/react";
import { PanPluginPackage } from "@embedpdf/plugin-pan/react";
import { RenderPluginPackage } from "@embedpdf/plugin-render/react";
import { ScrollPluginPackage } from "@embedpdf/plugin-scroll/react";
import { SearchPluginPackage } from "@embedpdf/plugin-search/react";
import { SelectionPluginPackage } from "@embedpdf/plugin-selection/react";
import { SpreadPluginPackage } from "@embedpdf/plugin-spread/react";
import { ThumbnailPluginPackage } from "@embedpdf/plugin-thumbnail/react";
import { TilingPluginPackage } from "@embedpdf/plugin-tiling/react";
import { ViewportPluginPackage } from "@embedpdf/plugin-viewport/react";
import { ZoomMode } from "@embedpdf/plugin-zoom";
import { ZoomPluginPackage } from "@embedpdf/plugin-zoom/react";
import { useMemo } from "react";
import {
  HIGHLIGHT_CATEGORY,
  HIGHLIGHT_COLOR,
  HIGHLIGHT_OPACITY,
  HIGHLIGHT_TOOL_ID,
} from "@/components/library/book-reader-annotation-config";
import { ReaderFullscreenContext } from "@/components/library/book-reader-fullscreen";
import { ReaderLayout } from "@/components/library/book-reader-layout";
import { BookReaderLoadingFrame } from "@/components/library/book-reader-loading-frame";
import type { BookAnnotationDto } from "@/features/library-annotations/types";
import { useZenMode } from "@/lib/editor/use-zen-mode";
import type { SubjectOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

export interface BookReaderProps {
  bookId: string;
  fileUrl: string;
  title: string;
  initialPage: number;
  initialZoomMobile: string | null;
  initialZoomDesktop: string | null;
  readerColorInverted: boolean;
  initialAnnotations: BookAnnotationDto[];
  aiEnabled: boolean;
  subjects: SubjectOption[];
}

// The `h-svh` parent gives the viewport beneath a definite height to fill;
// without it the viewport measures zero and gates its pages to a blank area.
// Fullscreen is CSS-driven (an in-app overlay at z-35), matching note/mindmap
// zen mode so the shared z-index ladder keeps menus, dialogs, windows, and
// toasts layered above it — unlike the browser Fullscreen API, which hides
// everything portaled to document.body.
export function BookReaderSurface(props: Readonly<BookReaderProps>) {
  const { isZenMode, toggleZenMode } = useZenMode();
  const fullscreenValue = useMemo(
    () => ({ isFullscreen: isZenMode, toggleFullscreen: toggleZenMode }),
    [isZenMode, toggleZenMode],
  );
  return (
    <ReaderFullscreenContext.Provider value={fullscreenValue}>
      <div
        className={cn("h-svh", isZenMode && "fixed inset-0 z-35 bg-background")}
      >
        <ReaderEngine {...props} />
      </div>
    </ReaderFullscreenContext.Provider>
  );
}

function ReaderEngine({
  bookId,
  fileUrl,
  title,
  initialPage,
  initialZoomMobile,
  initialZoomDesktop,
  readerColorInverted,
  initialAnnotations,
  aiEnabled,
  subjects,
}: Readonly<BookReaderProps>) {
  const { engine, isLoading, error } = usePdfiumEngine();

  // Memoized so the plugin registrations keep a stable identity across renders;
  // a new array would re-initialize the whole viewer (correctness, not perf).
  const plugins = useMemo(() => buildReaderPlugins(fileUrl), [fileUrl]);

  if (error) {
    return <BookReaderLoadingFrame message="This book could not be loaded." />;
  }
  if (isLoading || !engine) {
    return <BookReaderLoadingFrame />;
  }

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      {({ activeDocumentId, activeDocument }) => {
        if (activeDocument?.status === "error") {
          return (
            <BookReaderLoadingFrame message="This book could not be loaded." />
          );
        }
        // Gate on a fully loaded document: the zoom plugin's auto-fit recalc
        // queries spread pages on the first viewport resize and throws if the
        // document is still loading.
        if (!activeDocumentId || activeDocument?.status !== "loaded") {
          return <BookReaderLoadingFrame />;
        }
        return (
          <ReaderLayout
            documentId={activeDocumentId}
            bookId={bookId}
            title={title}
            initialPage={initialPage}
            initialZoomMobile={initialZoomMobile}
            initialZoomDesktop={initialZoomDesktop}
            readerColorInverted={readerColorInverted}
            initialAnnotations={initialAnnotations}
            aiEnabled={aiEnabled}
            subjects={subjects}
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
// selection as the default. The annotation plugin locks every category EXCEPT
// our user-highlight category: pre-existing PDF annotations stay read-only and
// LINK annotations stay clickable (rendered with a pointer cursor, navigation
// auto-mounted), while the user's own highlights remain selectable so notes can
// be edited and highlights deleted. The built-in "highlight" tool is overridden
// to tag created highlights with our category and to paint them in the reader's
// highlighter color.
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
    // Search owns document-wide text matching; SearchLayer is mounted per page
    // in the layout so EmbedPDF paints its native result highlights.
    createPluginRegistration(SearchPluginPackage),
    // Everything locked except the user-highlight category, so existing PDF
    // annotations and links stay read-only while the user's highlights can be
    // selected, annotated, and deleted.
    createPluginRegistration(AnnotationPluginPackage, {
      locked: { type: LockModeType.Exclude, categories: [HIGHLIGHT_CATEGORY] },
      // Creating a highlight should just highlight; it must not auto-select the
      // new annotation and pop its note panel. The user opens the panel by
      // clicking the highlight afterwards. The tool-level `behavior` is what the
      // highlight tool actually honors — the plugin-level flag alone is not
      // enough, so set both.
      selectAfterCreate: false,
      tools: [
        {
          id: HIGHLIGHT_TOOL_ID,
          categories: ["annotation", HIGHLIGHT_CATEGORY],
          behavior: { selectAfterCreate: false },
          defaults: {
            custom: { category: HIGHLIGHT_CATEGORY },
            strokeColor: HIGHLIGHT_COLOR,
            opacity: HIGHLIGHT_OPACITY,
          },
        },
      ],
    }),
    // FitPage so a book opens showing the whole page; FitWidth stretched small
    // page sizes to the viewport width, opening at an oversized zoom (~450%).
    createPluginRegistration(ZoomPluginPackage, {
      defaultZoomLevel: ZoomMode.FitPage,
    }),
    createPluginRegistration(SpreadPluginPackage),
    // "instant" so re-opening the Pages sidebar snaps to the current page.
    createPluginRegistration(ThumbnailPluginPackage, {
      scrollBehavior: "instant",
    }),
    // Reads the document's embedded outline so the sidebar's Content view can
    // list the table of contents.
    createPluginRegistration(BookmarkPluginPackage),
  ];
}
