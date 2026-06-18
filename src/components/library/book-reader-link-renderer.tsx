"use client";

import { PdfAnnotationSubtype, type PdfLinkAnnoObject } from "@embedpdf/models";
import {
  type AnnotationRendererProps,
  createRenderer,
} from "@embedpdf/plugin-annotation/react";
import { useNavigateTarget } from "@/components/library/use-reader-navigate-target";
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
  const navigate = useNavigateTarget(documentId);

  return (
    <button
      type="button"
      onClick={() => navigate(annotation.object.target)}
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
