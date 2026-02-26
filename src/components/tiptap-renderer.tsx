"use client";

import Highlight from "@tiptap/extension-highlight";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface TiptapRendererProps {
  content: string;
  className?: string;
}

export function TiptapRenderer({
  content,
  className,
}: Readonly<TiptapRendererProps>) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
    ],
    content,
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
    const currentHTML = editor.isEmpty ? "" : editor.getHTML();
    if (content !== currentHTML) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [editor, content]);

  return (
    <div className={cn("tiptap-content", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
