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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadEditorImage } from "@/app/actions/attachments";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LIMITS } from "@/lib/config/limits";
import { shouldSubmitEditorOnCtrlEnter } from "@/lib/editor/editor-submit-shortcuts";
import { normalizeRichTextForRendering } from "@/lib/editor/rich-text";
import { resolveEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";
import { tiptapLowlight } from "@/lib/editor/tiptap-lowlight";
import { t } from "@/lib/server/server-action-errors";
import { cn } from "@/lib/utils";

export type EditorImageUploadContext = "notes" | "flashcards";

function insertImage(editor: Editor, src: string) {
  editor.chain().focus().setImage({ src }).run();
}

function getPastedImageFile(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) {
    return null;
  }

  for (const item of Array.from(items)) {
    if (item.kind !== "file") {
      continue;
    }

    const file = item.getAsFile();
    if (!file) {
      continue;
    }

    if (!file.type.toLowerCase().startsWith("image/")) {
      continue;
    }

    return file;
  }

  return null;
}

function readFileAsBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve(null);
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        resolve(null);
        return;
      }

      const commaIndex = reader.result.indexOf(",");
      if (commaIndex < 0 || commaIndex + 1 >= reader.result.length) {
        resolve(null);
        return;
      }

      resolve(reader.result.slice(commaIndex + 1));
    };

    reader.readAsDataURL(file);
  });
}

function getPastedImageFileName(file: File): string {
  const name = file.name.trim();
  if (name.length > 0) {
    return name;
  }

  const extension = file.type.split("/")[1] ?? "png";
  return `pasted-image.${extension}`;
}

async function uploadPastedImage(
  editor: Editor,
  file: File,
  context: EditorImageUploadContext,
) {
  if (file.size > LIMITS.attachmentMaxBytes) {
    toast.error(
      t("limits.attachmentSizeLimit", { max: LIMITS.attachmentMaxBytes }),
    );
    return;
  }

  const dataBase64 = await readFileAsBase64(file);

  if (!dataBase64) {
    toast.error(t("attachments.uploadFailed"));
    return;
  }

  let result: Awaited<ReturnType<typeof uploadEditorImage>>;

  try {
    result = await uploadEditorImage({
      fileName: getPastedImageFileName(file),
      mimeType: file.type,
      dataBase64,
      context,
    });
  } catch {
    toast.error(t("attachments.uploadFailed"));
    return;
  }

  if (!result.success) {
    toast.error(t(result.errorCode, result.errorParams));
    return;
  }

  insertImage(editor, result.url);
}

function createImageUrlPasteExtension(
  imageUploadContext: EditorImageUploadContext,
) {
  return Extension.create({
    name: "imageUrlPaste",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handlePaste: (_, event) => {
              const imageFile = getPastedImageFile(event);
              if (imageFile) {
                void uploadPastedImage(
                  this.editor,
                  imageFile,
                  imageUploadContext,
                );
                return true;
              }

              const src =
                event.clipboardData?.getData("text/plain")?.trim() ?? "";
              const directImageUrl = resolveEmbeddableImageUrl(src);
              if (directImageUrl) {
                insertImage(this.editor, directImageUrl);
                return true;
              }

              return false;
            },
          },
        }),
      ];
    },
  });
}

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  contentClassName?: string;
  showToolbar?: boolean;
  imageUploadContext?: EditorImageUploadContext;
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

function EditorToolbar({ editor }: Readonly<{ editor: Editor | null }>) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-2 py-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title="Highlight"
      >
        <Highlighter className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <SquareCode className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
        title="Task List"
      >
        <ListChecks className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Quote"
      >
        <Quote className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      >
        <Minus className="size-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
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
  imageUploadContext = "notes",
  onCtrlEnter,
}: Readonly<TiptapEditorProps>) {
  const resolvedPlaceholder = placeholder ?? "Start writing your notes...";
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
      createImageUrlPasteExtension(imageUploadContext),
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

    void normalizeRichTextForRendering(value, async (candidate) =>
      resolveEmbeddableImageUrl(candidate),
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
        ariaInvalid &&
          "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
      )}
    >
      {showToolbar && <EditorToolbar editor={editor} />}
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
