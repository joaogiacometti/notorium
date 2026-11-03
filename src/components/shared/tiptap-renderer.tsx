"use client";

import { createDocument } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { type ReactNode, useEffect } from "react";
import type { RichTextDocument } from "@/lib/editor/document";
import { buildDocumentExtensions } from "@/lib/editor/document-extensions";
import { trimDisplayParagraphs } from "@/lib/editor/trim-display-paragraphs";
import { cn } from "@/lib/utils";

interface TiptapRendererProps {
  content: RichTextDocument;
  className?: string;
  /** Shown until the editor exists; it is created after the first render. */
  fallback?: ReactNode;
}

export function TiptapRenderer({
  content,
  className,
  fallback,
}: Readonly<TiptapRendererProps>) {
  const editor = useEditor({
    // The trailing empty paragraph only gives editors a place to type
    // after a list or code block; read-only, it renders as a blank gap.
    extensions: buildDocumentExtensions(),
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-renderer-content",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const document = createDocument(content, editor.schema);
    editor.commands.setContent(trimDisplayParagraphs(document.toJSON()), {
      emitUpdate: false,
    });
  }, [editor, content]);

  if (!editor && fallback !== undefined) return fallback;

  return (
    <div className={cn("tiptap-content", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
