"use client";

import { PdfAnnotationSubtype, type PdfLinkAnnoObject } from "@embedpdf/models";
import {
  type AnnotationRendererProps,
  createRenderer,
} from "@embedpdf/plugin-annotation/react";
import { detectReaderDevice } from "@/components/library/reader-device";
import { useNavigateTarget } from "@/components/library/use-reader-navigate-target";
import { cn } from "@/lib/utils";

// Custom renderer for PDF LINK annotations. The reader runs the annotation
// plugin in fully locked mode, where the built-in link renderer falls back to an
// invisible hotspot that only sets a pointer cursor. Replacing it (same `id`, so
// it overrides the default) lets us paint a visible affordance — a tinted box
// with an underline that brightens on hover — so links read as links, the way
// Zotero and desktop PDF viewers indicate them.
//
// Desktop only (FEAT-002). The link rects are correct: rendering the page
// through the same pdfium engine and overlaying the rects lands them dead-on the
// link glyphs, and desktop is pixel-perfect at every zoom. On TOUCH devices,
// though, the viewer composites the annotation layer with a vertical
// position/scale mismatch against the page raster — the misalignment is small
// near the top of a page and grows further down, so it is not a constant offset
// a CSS transform could cancel. Until that touch-layer mismatch is fixed
// upstream, we skip the visible box on mobile and fall back to the engine's
// invisible hotspot (the link is still navigable) rather than paint a box that
// sits off its text.
function LinkHotspot({
  annotation,
  documentId,
}: Readonly<AnnotationRendererProps<PdfLinkAnnoObject>>) {
  const navigate = useNavigateTarget(documentId);
  const showIndicator = detectReaderDevice() === "desktop";

  return (
    <button
      type="button"
      onClick={() => navigate(annotation.object.target)}
      className={cn(
        "h-full w-full cursor-pointer rounded-[2px]",
        showIndicator &&
          "border-b border-(--primary) bg-(--primary)/10 transition-colors hover:bg-(--primary)/25",
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
