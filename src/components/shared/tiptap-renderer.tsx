"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type ReactNode, useEffect, useState } from "react";
import { normalizeRichTextForRendering } from "@/lib/editor/rich-text";
import { resolveEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";
import { tiptapLowlight } from "@/lib/editor/tiptap-lowlight";
import { buildMathExtensions } from "@/lib/editor/tiptap-math-extensions";
import { buildTableExtensions } from "@/lib/editor/tiptap-table-extensions";
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
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        // The trailing empty paragraph only gives editors a place to type
        // after a list or code block; read-only, it renders as a blank gap.
        trailingNode: false,
      }),
      CodeBlockLowlight.configure({
        defaultLanguage: "plaintext",
        lowlight: tiptapLowlight,
      }),
      Highlight,
      Image.configure({ allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ...buildTableExtensions(),
      ...buildMathExtensions(),
    ],
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
