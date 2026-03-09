"use client";

import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { normalizeRichTextForRendering } from "@/lib/editor/rich-text";
import { resolveSharedEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";
import { cn } from "@/lib/utils";

interface TiptapRendererProps {
  content: string;
  className?: string;
}

export function TiptapRenderer({
  content,
  className,
}: Readonly<TiptapRendererProps>) {
  const [resolvedContent, setResolvedContent] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Highlight,
      Image.configure({ allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
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

    void normalizeRichTextForRendering(
      content,
      resolveSharedEmbeddableImageUrl,
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

  return (
    <div className={cn("tiptap-content", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
