"use client";

import type { PdfLinkTarget } from "@embedpdf/models";
import { useAnnotationCapability } from "@embedpdf/plugin-annotation/react";
import { useReaderNavHistory } from "@/components/library/book-reader-nav-history";

/**
 * Follows a PDF link target through the annotation plugin's navigator, the way a
 * LINK annotation click and an outline (table-of-contents) entry both jump to a
 * destination. Records the current view first so the toolbar's back control can
 * return here, then drops that record if the target opened externally (a URI) or
 * could not be resolved — matching desktop viewers that only push history for
 * in-document jumps.
 *
 * @example
 * const navigate = useNavigateTarget(documentId);
 * navigate(bookmark.target);
 */
export function useNavigateTarget(documentId: string) {
  const { provides } = useAnnotationCapability();
  const history = useReaderNavHistory();

  return (target: PdfLinkTarget | undefined) => {
    if (!target || !provides) return;
    history.recordCurrentView();
    provides
      .forDocument(documentId)
      .navigateTarget(target)
      .wait(
        (result) => {
          if (
            result.outcome !== "navigated" &&
            result.outcome !== "destination"
          ) {
            history.discardLastView();
          }
        },
        () => history.discardLastView(),
      );
  };
}
