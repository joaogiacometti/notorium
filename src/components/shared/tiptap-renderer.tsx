"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { type ReactNode, useEffect, useState } from "react";
import { normalizeRichTextForRendering } from "@/lib/editor/rich-text";
import { buildRichTextReviewExtensions } from "@/lib/editor/rich-text-review-schema";
import { resolveEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";
import { cn } from "@/lib/utils";

interface TiptapRendererProps {
  content: string;
  className?: string;
  /** Shown until the editor exists; it is created after the first render. */
  fallback?: ReactNode;
}

export function TiptapRenderer({
  content,
  className,
  fallback,
}: Readonly<TiptapRendererProps>) {
  const [resolvedContent, setResolvedContent] = useState(content);

  const editor = useEditor({
    // The trailing empty paragraph only gives editors a place to type
    // after a list or code block; read-only, it renders as a blank gap.
    extensions: buildRichTextReviewExtensions(),
    content: resolvedContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-renderer-content",
      },
    },
  });

  useEffect(() => {
    let active = true;

    void normalizeRichTextForRendering(content, async (candidate) =>
      resolveEmbeddableImageUrl(candidate),
    ).then((nextContent) => {
      if (active) {
        setResolvedContent(nextContent);
      }
    });

    return () => {
      active = false;
    };
  }, [content]);

  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.isEmpty ? "" : editor.getHTML();
    if (resolvedContent !== currentHTML) {
      editor.commands.setContent(resolvedContent || "", { emitUpdate: false });
    }
  }, [editor, resolvedContent]);

  if (!editor && fallback !== undefined) return fallback;

  return (
    <div className={cn("tiptap-content", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
