"use client";

import { useDocumentState } from "@embedpdf/core/react";
import {
  PdfActionType,
  type PdfDestinationObject,
  type PdfLinkTarget,
  PdfZoomMode,
} from "@embedpdf/models";
import { useAnnotationCapability } from "@embedpdf/plugin-annotation/react";
import { useScroll } from "@embedpdf/plugin-scroll/react";
import { useReaderNavHistory } from "@/components/library/book-reader-nav-history";

/**
 * Follows a PDF link target instantly. Internal destinations bypass EmbedPDF's
 * smooth annotation navigator and scroll directly; external targets still route
 * through the annotation plugin so URI handling stays centralized.
 *
 * @example
 * const navigate = useNavigateTarget(documentId);
 * navigate(bookmark.target);
 */
export function useNavigateTarget(documentId: string) {
  const { provides: annotation } = useAnnotationCapability();
  const { provides: scroll } = useScroll(documentId);
  const documentState = useDocumentState(documentId);
  const history = useReaderNavHistory();

  return (target: PdfLinkTarget | undefined) => {
    if (!target) return;
    const destination = destinationFromTarget(target);
    if (!destination) {
      annotation?.forDocument(documentId).navigateTarget(target);
      return;
    }
    if (!scroll) return;
    history.recordCurrentView();
    scroll.scrollToPage({
      pageNumber: destination.pageIndex + 1,
      pageCoordinates: coordinatesFromDestination(destination, documentState),
      behavior: "instant",
    });
  };
}

function destinationFromTarget(
  target: PdfLinkTarget,
): PdfDestinationObject | null {
  if (target.type === "destination") return target.destination;
  if (
    target.action.type === PdfActionType.Goto ||
    target.action.type === PdfActionType.RemoteGoto
  ) {
    return target.action.destination;
  }
  return null;
}

function coordinatesFromDestination(
  destination: PdfDestinationObject,
  documentState: ReturnType<typeof useDocumentState>,
) {
  if (destination.zoom.mode !== PdfZoomMode.XYZ) return undefined;
  const page = documentState?.document?.pages.find(
    (candidate) => candidate.index === destination.pageIndex,
  );
  if (!page || !destination.zoom.params) return undefined;
  return {
    x: destination.zoom.params.x,
    y: page.size.height - destination.zoom.params.y,
  };
}
