"use client";

import { PdfAnnotationSubtype, type PdfLinkAnnoObject } from "@embedpdf/models";
import {
  type AnnotationRendererProps,
  createRenderer,
  useAnnotationCapability,
} from "@embedpdf/plugin-annotation/react";
import { useReaderNavHistory } from "@/components/library/book-reader-nav-history";
import { cn } from "@/lib/utils";

// Custom renderer for PDF LINK annotations. The reader runs the annotation
// plugin in fully locked mode, where the built-in link renderer falls back to an
// invisible hotspot that only sets a pointer cursor. Replacing it (same `id`, so
// it overrides the default) lets us paint a visible affordance — a tinted box
// with an underline that brightens on hover — so links read as links, the way
// Zotero and desktop PDF viewers indicate them.

function LinkHotspot({
  annotation,
  documentId,
}: Readonly<AnnotationRendererProps<PdfLinkAnnoObject>>) {
  const { provides } = useAnnotationCapability();
  const history = useReaderNavHistory();

  // Record where we are before jumping so the toolbar's back control can return
  // here; drop the record again if the link turned out to be an external URI (or
  // unsupported), which opens elsewhere rather than moving the page.
  const navigate = () => {
    const target = annotation.object.target;
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

  return (
    <button
      type="button"
      onClick={navigate}
      className={cn(
        "h-full w-full cursor-pointer rounded-[2px]",
        "border-b border-(--primary) bg-(--primary)/10",
        "transition-colors hover:bg-(--primary)/25",
      )}
      style={{ pointerEvents: "auto" }}
    />
  );
}

export const linkAnnotationRenderer = createRenderer<PdfLinkAnnoObject>({
  id: "link",
  matches: (a): a is PdfLinkAnnoObject => a.type === PdfAnnotationSubtype.LINK,
  render: (props) => <LinkHotspot {...props} />,
  renderLocked: (props) => <LinkHotspot {...props} />,
});
