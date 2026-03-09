"use client";

import { Extension } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import { Plugin } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  SquareCode,
  Strikethrough,
  UnderlineIcon,
  Undo,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { shouldSubmitEditorOnCtrlEnter } from "@/lib/editor/editor-submit-shortcuts";
import { normalizeRichTextForRendering } from "@/lib/editor/rich-text";
import {
  isSupportedSharedImageUrl,
  resolveEmbeddableImageUrl,
  resolveSharedEmbeddableImageUrl,
} from "@/lib/editor/tiptap-image-url";
import { tiptapLowlight } from "@/lib/editor/tiptap-lowlight";
import { resolvePastedImageUrl } from "@/lib/editor/tiptap-paste-image-url";
import { cn } from "@/lib/utils";

function insertImage(editor: Editor, src: string) {
  editor.chain().focus().setImage({ src }).run();
}

function insertText(editor: Editor, value: string) {
  editor.chain().focus().insertContent(value).run();
}

const ImageUrlPasteExtension = Extension.create({
  name: "imageUrlPaste",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (_, event) => {
            const src =
              event.clipboardData?.getData("text/plain")?.trim() ?? "";
            const directImageUrl = resolveEmbeddableImageUrl(src);
            if (directImageUrl) {
              insertImage(this.editor, directImageUrl);
              return true;
            }

            if (!isSupportedSharedImageUrl(src)) {
              return false;
            }

            void resolvePastedImageUrl(src).then((resolution) => {
              if (resolution.imageUrl) {
                insertImage(this.editor, resolution.imageUrl);
                return;
              }

              if (resolution.fallbackText) {
                insertText(this.editor, resolution.fallbackText);
              }
            });

            return true;
          },
        },
      }),
    ];
  },
});

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  contentClassName?: string;
  showToolbar?: boolean;
  onCtrlEnter?: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: Readonly<ToolbarButtonProps>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-8 shrink-0 text-muted-foreground hover:text-foreground",
        isActive && "bg-accent text-accent-foreground",
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );
}

function EditorToolbar({
  editor,
  t,
}: Readonly<{ editor: Editor | null; t: ReturnType<typeof useTranslations> }>) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-2 py-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title={t("bold")}
      >
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title={t("italic")}
      >
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title={t("underline")}
      >
        <UnderlineIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title={t("strikethrough")}
      >
        <Strikethrough className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title={t("highlight")}
      >
        <Highlighter className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title={t("inline_code")}
      >
        <Code className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title={t("code_block")}
      >
        <SquareCode className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title={t("heading_1")}
      >
        <Heading1 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title={t("heading_2")}
      >
        <Heading2 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title={t("heading_3")}
      >
        <Heading3 className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title={t("bullet_list")}
      >
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title={t("numbered_list")}
      >
        <ListOrdered className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
        title={t("task_list")}
      >
        <ListChecks className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title={t("quote")}
      >
        <Quote className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={t("divider")}
      >
        <Minus className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title={t("undo")}
      >
        <Undo className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title={t("redo")}
      >
        <Redo className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}

export function TiptapEditor({
  value,
  onChange,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  contentClassName,
  showToolbar = true,
  onCtrlEnter,
}: Readonly<TiptapEditorProps>) {
  const t = useTranslations("TiptapEditor");
  const resolvedPlaceholder = placeholder ?? t("placeholder");
  const onCtrlEnterRef = useRef(onCtrlEnter);
  const [resolvedValue, setResolvedValue] = useState(value);
  onCtrlEnterRef.current = onCtrlEnter;

  const handleUpdate = ({
    editor,
  }: {
    editor: { getHTML: () => string; isEmpty: boolean };
  }) => {
    const html = editor.isEmpty ? "" : editor.getHTML();
    onChange(html);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        defaultLanguage: "plaintext",
        enableTabIndentation: true,
        lowlight: tiptapLowlight,
      }),
      Placeholder.configure({ placeholder: resolvedPlaceholder }),
      Highlight.configure({ multicolor: false }),
      Image.configure({
        allowBase64: false,
        resize: {
          enabled: true,
          minWidth: 120,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      ImageUrlPasteExtension,
    ],
    content: resolvedValue || "",
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        id: id ?? "",
        "aria-invalid": ariaInvalid ? "true" : "false",
        class: "tiptap-editor-content",
      },
      handleKeyDown: (_, event) => {
        if (
          !onCtrlEnterRef.current ||
          !shouldSubmitEditorOnCtrlEnter({
            key: event.key,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
          })
        ) {
          return false;
        }

        event.preventDefault();
        onCtrlEnterRef.current();
        return true;
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    let active = true;

    void normalizeRichTextForRendering(
      value,
      resolveSharedEmbeddableImageUrl,
    ).then((nextValue) => {
      if (active) {
        setResolvedValue(nextValue);
      }
    });

    return () => {
      active = false;
    };
  }, [value]);

  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.isEmpty ? "" : editor.getHTML();
    if (resolvedValue !== currentHTML) {
      editor.commands.setContent(resolvedValue || "", { emitUpdate: false });
    }
  }, [editor, resolvedValue]);

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-md border border-input shadow-xs transition-colors",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
      )}
    >
      {showToolbar && <EditorToolbar editor={editor} t={t} />}
      <EditorContent
        editor={editor}
        className={cn(
          "tiptap-wrapper min-h-52 max-h-[52svh] overflow-y-auto",
          contentClassName,
        )}
      />
    </div>
  );
}
