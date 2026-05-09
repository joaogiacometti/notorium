"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  createImageUrlPasteExtension,
  type EditorImageUploadContext,
  type EditorImageUploadTracker,
  isExternalEditorValueChange,
  shouldApplyNormalizedEditorValue,
} from "@/components/shared/tiptap-helpers";
import { shouldSubmitEditorOnCtrlEnter } from "@/lib/editor/editor-submit-shortcuts";
import { normalizeRichTextForRendering } from "@/lib/editor/rich-text";
import { resolveEmbeddableImageUrl } from "@/lib/editor/tiptap-image-url";
import { tiptapLowlight } from "@/lib/editor/tiptap-lowlight";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  className?: string;
  contentClassName?: string;
  imageUploadContext?: EditorImageUploadContext;
  onCtrlEnter?: () => void;
  onImageUploadPendingChange?: (pending: boolean) => void;
}

export function TiptapEditor({
  value,
  onChange,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  className,
  contentClassName,
  imageUploadContext = "notes",
  onCtrlEnter,
  onImageUploadPendingChange,
}: Readonly<TiptapEditorProps>) {
  const resolvedPlaceholder = placeholder ?? "Start writing your notes...";
  const onCtrlEnterRef = useRef(onCtrlEnter);
  const onImageUploadPendingChangeRef = useRef(onImageUploadPendingChange);
  const activeUploadsRef = useRef(0);
  const [resolvedValue, setResolvedValue] = useState(value);
  const [isImageUploadPending, setIsImageUploadPending] = useState(false);
  const lastEmittedValueRef = useRef(value);
  const latestValueRef = useRef(value);
  onCtrlEnterRef.current = onCtrlEnter;
  onImageUploadPendingChangeRef.current = onImageUploadPendingChange;
  latestValueRef.current = value;

  const imageUploadTracker: EditorImageUploadTracker = {
    start: () => {
      activeUploadsRef.current += 1;
      if (activeUploadsRef.current === 1) {
        setIsImageUploadPending(true);
      }
    },
    finish: () => {
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
      if (activeUploadsRef.current === 0) {
        setIsImageUploadPending(false);
      }
    },
  };

  const handleUpdate = ({
    editor,
  }: {
    editor: { getHTML: () => string; isEmpty: boolean };
  }) => {
    const html = editor.isEmpty ? "" : editor.getHTML();
    lastEmittedValueRef.current = html;
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
      createImageUrlPasteExtension(
        imageUploadContext,
        () => activeUploadsRef.current > 0,
        imageUploadTracker,
      ),
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
    if (!isExternalEditorValueChange(value, lastEmittedValueRef.current)) {
      return;
    }

    let active = true;
    const requestedValue = value;

    void normalizeRichTextForRendering(requestedValue, async (candidate) =>
      resolveEmbeddableImageUrl(candidate),
    ).then((nextValue) => {
      if (
        active &&
        shouldApplyNormalizedEditorValue(requestedValue, latestValueRef.current)
      ) {
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

  useEffect(() => {
    onImageUploadPendingChangeRef.current?.(isImageUploadPending);
  }, [isImageUploadPending]);

  useEffect(() => {
    return () => {
      if (activeUploadsRef.current > 0) {
        onImageUploadPendingChangeRef.current?.(false);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-md border border-input shadow-xs transition-colors",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        ariaInvalid &&
          "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        className,
      )}
    >
      {isImageUploadPending ? (
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Uploading image...</span>
        </div>
      ) : null}
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
