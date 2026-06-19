"use client";

import type { AnnotationSelectionMenuProps } from "@embedpdf/plugin-annotation/react";
import { useAnnotation } from "@embedpdf/plugin-annotation/react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/config/limits";

type ReaderAnnotationMenuProps = AnnotationSelectionMenuProps & {
  documentId: string;
};

// Contextual panel shown when a user highlight is selected: edit its note or
// delete it. Rendered by the AnnotationLayer through its `selectionMenu` prop, so
// `menuWrapperProps` must be spread onto the outer element for the plugin to keep
// it positioned as the page rotates. The note is written into the annotation's
// `contents` field on blur, which fires the update the persistence hook saves.
export function ReaderAnnotationMenu({
  selected,
  context,
  menuWrapperProps,
  rect,
  documentId,
}: Readonly<ReaderAnnotationMenuProps>) {
  const { provides: annotationApi } = useAnnotation(documentId);
  const annotation = context.annotation.object;
  const [note, setNote] = useState(annotation.contents ?? "");

  // Reset the field when the selection moves to a different highlight so the
  // panel never shows a stale note from the previously selected one.
  useEffect(() => {
    setNote(annotation.contents ?? "");
  }, [annotation.contents]);

  if (!selected) return null;

  function commitNote() {
    const next = note.trim();
    if (next === (annotation.contents ?? "")) return;
    annotationApi?.updateAnnotation(context.pageIndex, annotation.id, {
      contents: next,
    });
  }

  function deleteHighlight() {
    annotationApi?.deleteAnnotation(context.pageIndex, annotation.id);
  }

  return (
    <div {...menuWrapperProps}>
      <div
        style={{ position: "absolute", top: rect.size.height + 8 }}
        className="pointer-events-auto w-64 cursor-default rounded-md border border-border bg-popover p-2 shadow-md"
      >
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={commitNote}
          maxLength={LIMITS.libraryAnnotationNoteMax}
          rows={3}
          placeholder="Add a note…"
          aria-label="Highlight note"
          className="resize-none text-sm"
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={deleteHighlight}
            className="gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
