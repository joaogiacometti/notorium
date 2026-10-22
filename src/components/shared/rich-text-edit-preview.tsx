"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import {
  buildRichTextReviewExtension,
  type RichTextReviewSegment,
} from "@/lib/editor/rich-text-review-decorations";
import {
  buildRichTextReviewExtensions,
  parseReviewedRichText,
} from "@/lib/editor/rich-text-review-schema";
import { cn } from "@/lib/utils";

interface RichTextEditPreviewProps {
  segments?: RichTextReviewSegment[];
  onReadyChange?: (ready: boolean) => void;
  original: string;
  replacement: string;
  label: string;
  className?: string;
}

/** Display proposed rich text with additions and removals outside persisted editor values.
 * @example <RichTextEditPreview original="<p>Old</p>" replacement="<p>New</p>" label="Suggested changes" />
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
        ...buildRichTextReviewExtensions(),
        buildRichTextReviewExtension(parseReviewedRichText(original), segments),
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
