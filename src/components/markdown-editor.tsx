"use client";

import {
  Bold,
  Code,
  Eye,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  rows?: number;
}

interface ToolbarAction {
  icon: React.ElementType;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
  { icon: Italic, label: "Italic", prefix: "_", suffix: "_" },
  { icon: Strikethrough, label: "Strikethrough", prefix: "~~", suffix: "~~" },
  { icon: Heading2, label: "Heading", prefix: "## ", suffix: "", block: true },
  { icon: Code, label: "Code", prefix: "`", suffix: "`" },
  {
    icon: Quote,
    label: "Quote",
    prefix: "> ",
    suffix: "",
    block: true,
  },
  {
    icon: List,
    label: "Bullet list",
    prefix: "- ",
    suffix: "",
    block: true,
  },
  {
    icon: ListOrdered,
    label: "Numbered list",
    prefix: "1. ",
    suffix: "",
    block: true,
  },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  rows = 8,
}: Readonly<MarkdownEditorProps>) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyFormatting = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.slice(start, end);

      let newText: string;
      let newCursorStart: number;
      let newCursorEnd: number;

      if (action.block) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const before = value.slice(0, lineStart);
        const after = value.slice(lineStart);

        if (after.startsWith(action.prefix)) {
          newText = before + after.slice(action.prefix.length);
          newCursorStart = start - action.prefix.length;
          newCursorEnd = end - action.prefix.length;
        } else {
          newText = `${before}${action.prefix}${after}`;
          newCursorStart = start + action.prefix.length;
          newCursorEnd = end + action.prefix.length;
        }
      } else if (selectedText) {
        newText = `${value.slice(0, start)}${action.prefix}${selectedText}${action.suffix}${value.slice(end)}`;
        newCursorStart = start + action.prefix.length;
        newCursorEnd = end + action.prefix.length;
      } else {
        const placeholder = "text";
        newText = `${value.slice(0, start)}${action.prefix}${placeholder}${action.suffix}${value.slice(end)}`;
        newCursorStart = start + action.prefix.length;
        newCursorEnd = newCursorStart + placeholder.length;
      }

      onChange(newText);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
      });
    },
    [value, onChange],
  );

  return (
    <div className="rounded-md border border-input shadow-xs transition-colors focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
      <div className="flex items-center justify-between border-b border-border/60 px-2 py-1">
        <div className="flex items-center gap-0.5">
          {mode === "write" &&
            TOOLBAR_ACTIONS.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => applyFormatting(action)}
                title={action.label}
              >
                <action.icon className="size-3.5" />
              </Button>
            ))}
        </div>
        <div className="flex items-center rounded-md bg-muted p-0.5">
          <Button
            type="button"
            variant={mode === "write" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setMode("write")}
          >
            <Pencil className="size-3" />
            Write
          </Button>
          <Button
            type="button"
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setMode("preview")}
          >
            <Eye className="size-3" />
            Preview
          </Button>
        </div>
      </div>

      {mode === "write" ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          id={id}
          aria-invalid={ariaInvalid}
          rows={rows}
          className={cn(
            "resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent",
          )}
        />
      ) : (
        <div
          className={cn("min-h-[calc(var(--rows)*1.625rem+1rem)] px-3 py-2")}
          style={{ "--rows": rows } as React.CSSProperties}
        >
          {value ? (
            <MarkdownRenderer content={value} className="text-sm" />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Nothing to preview
            </p>
          )}
        </div>
      )}
    </div>
  );
}
