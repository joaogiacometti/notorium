"use client";

import type { AnnotationSelectionMenuProps } from "@embedpdf/plugin-annotation/react";
import { useAnnotation } from "@embedpdf/plugin-annotation/react";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveBookAnnotation } from "@/app/actions/library-annotations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { HighlightAnnotationInput } from "@/features/library-annotations/validation";
import { LIMITS } from "@/lib/config/limits";
import { t } from "@/lib/server/server-action-errors";

type ReaderAnnotationMenuProps = AnnotationSelectionMenuProps & {
  documentId: string;
  bookId: string;
};

// Contextual panel shown when a user highlight is selected: edit its note or
// delete it. Rendered by the AnnotationLayer through its `selectionMenu` prop, so
// `menuWrapperProps` must be spread onto the outer element for the plugin to keep
// it positioned as the page rotates. The note is saved after a short typing
// pause and on blur, so refreshing without leaving the field does not lose it.
export function ReaderAnnotationMenu({
  selected,
  context,
  menuWrapperProps,
  rect,
  documentId,
  bookId,
}: Readonly<ReaderAnnotationMenuProps>) {
  const { provides: annotationApi } = useAnnotation(documentId);
  const annotation = context.annotation.object;
  const [note, setNote] = useState(annotation.contents ?? "");
  const savedNoteRef = useRef(annotation.contents ?? "");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the field when the selection moves to a different highlight so the
  // panel never shows a stale note from the previously selected one.
  useEffect(() => {
    setNote(annotation.contents ?? "");
    savedNoteRef.current = annotation.contents ?? "";
  }, [annotation.contents]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    },
    [],
  );

  if (!selected) return null;

  function clearScheduledSave() {
    if (saveTimeoutRef.current === null) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
  }

  function updateNote(nextNote: string) {
    setNote(nextNote);
    clearScheduledSave();
    saveTimeoutRef.current = setTimeout(() => {
      void commitNote(nextNote);
    }, 800);
  }

  async function commitNote(nextNote: string) {
    clearScheduledSave();
    const next = nextNote.trim();
    if (next === savedNoteRef.current) return;

    annotationApi?.updateAnnotation(context.pageIndex, annotation.id, {
      contents: next,
    });

    const result = await saveBookAnnotation({
      bookId,
      annotation: JSON.parse(
        JSON.stringify({ ...annotation, contents: next }),
      ) as HighlightAnnotationInput,
    });
    if (!result.success) {
      toast.error(t(result.errorCode, result.errorParams));
      return;
    }
    savedNoteRef.current = next;
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
          onChange={(event) => updateNote(event.target.value)}
          onBlur={() => void commitNote(note)}
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
