"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import type { RichTextDocument } from "@/lib/editor/document";
import { documentToNode } from "@/lib/editor/document";
import { buildDocumentExtensions } from "@/lib/editor/document-extensions";
import {
  buildRichTextReviewExtension,
  type RichTextReviewSegment,
} from "@/lib/editor/rich-text-review-decorations";
import { cn } from "@/lib/utils";

interface RichTextEditPreviewProps {
  segments?: RichTextReviewSegment[];
  onReadyChange?: (ready: boolean) => void;
  original: RichTextDocument;
  replacement: RichTextDocument;
  label: string;
  className?: string;
}

/** Display proposed rich text with additions and removals outside persisted editor values.
 * @example <RichTextEditPreview original={before} replacement={after} label="Suggested changes" />
 */
export function RichTextEditPreview({
  original,
  segments,
  onReadyChange,
  replacement,
  label,
  className,
}: Readonly<RichTextEditPreviewProps>) {
  const editor = useEditor(
    {
      extensions: [
        ...buildDocumentExtensions(),
        buildRichTextReviewExtension(documentToNode(original), segments),
      ],
      content: replacement,
      editable: false,
      immediatelyRender: false,
      editorProps: {
        attributes: { class: "tiptap-editor-content", "aria-label": label },
      },
    },
    [original, replacement, segments],
  );
  const readyRef = useRef(onReadyChange);
  readyRef.current = onReadyChange;
  useEffect(() => {
    readyRef.current?.(Boolean(editor));
    return () => readyRef.current?.(false);
  }, [editor]);
  return (
    <div
      className={cn("tiptap-content min-h-0 overflow-y-auto p-3", className)}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
