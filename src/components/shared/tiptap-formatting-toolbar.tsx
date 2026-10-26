"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  SquareCode,
  Table2,
} from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TiptapFormattingToolbarProps {
  editor: Editor;
  imageUploadPending: boolean;
  onEditLink: () => void;
  onSelectImage: () => void;
}

interface ToolbarAction {
  active?: boolean;
  disabled?: boolean;
  group: string;
  icon: React.ReactNode;
  label: string;
  run: () => void;
}

/**
 * Exposes the shared rich-text commands in a compact, keyboard-accessible bar.
 * @example <TiptapFormattingToolbar editor={editor} onEditLink={openLink} />
 */
export function TiptapFormattingToolbar({
  editor,
  imageUploadPending,
  onEditLink,
  onSelectImage,
}: Readonly<TiptapFormattingToolbarProps>) {
  const active = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      blockquote: currentEditor.isActive("blockquote"),
      bold: currentEditor.isActive("bold"),
      bulletList: currentEditor.isActive("bulletList"),
      code: currentEditor.isActive("code"),
      codeBlock: currentEditor.isActive("codeBlock"),
      heading1: currentEditor.isActive("heading", { level: 1 }),
      heading2: currentEditor.isActive("heading", { level: 2 }),
      heading3: currentEditor.isActive("heading", { level: 3 }),
      italic: currentEditor.isActive("italic"),
      link: currentEditor.isActive("link"),
      orderedList: currentEditor.isActive("orderedList"),
      taskList: currentEditor.isActive("taskList"),
    }),
  });
  const chain = () => editor.chain().focus();
  const actions: ToolbarAction[] = [
    {
      label: "Heading 1",
      icon: <Heading1 />,
      group: "heading",
      active: active.heading1,
      run: () => chain().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      icon: <Heading2 />,
      group: "heading",
      active: active.heading2,
      run: () => chain().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Heading 3",
      icon: <Heading3 />,
      group: "heading",
      active: active.heading3,
      run: () => chain().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Bold",
      icon: <Bold />,
      group: "inline",
      active: active.bold,
      run: () => chain().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: <Italic />,
      group: "inline",
      active: active.italic,
      run: () => chain().toggleItalic().run(),
    },
    {
      label: "Inline code",
      icon: <Code />,
      group: "inline",
      active: active.code,
      run: () => chain().toggleCode().run(),
    },
    {
      label: "Bullet list",
      icon: <List />,
      group: "list",
      active: active.bulletList,
      run: () => chain().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: <ListOrdered />,
      group: "list",
      active: active.orderedList,
      run: () => chain().toggleOrderedList().run(),
    },
    {
      label: "Task list",
      icon: <ListChecks />,
      group: "list",
      active: active.taskList,
      run: () => chain().toggleTaskList().run(),
    },
    {
      label: "Quote",
      icon: <Quote />,
      group: "block",
      active: active.blockquote,
      run: () => chain().toggleBlockquote().run(),
    },
    {
      label: "Code block",
      icon: <SquareCode />,
      group: "block",
      active: active.codeBlock,
      run: () => chain().toggleCodeBlock().run(),
    },
    {
      label: "Link",
      icon: <Link />,
      group: "insert",
      active: active.link,
      run: onEditLink,
    },
    {
      label: "Table",
      icon: <Table2 />,
      group: "insert",
      run: () =>
        chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      label: imageUploadPending ? "Uploading image" : "Image",
      icon: <ImagePlus />,
      group: "insert",
      disabled: imageUploadPending,
      run: onSelectImage,
    },
  ];

  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label="Text formatting"
        aria-orientation="horizontal"
        onKeyDown={moveToolbarFocus}
        className="flex shrink-0 items-center overflow-x-auto border-b bg-background/95 px-2 py-1"
      >
        {actions.map((action, index) => (
          <Fragment key={action.label}>
            {index > 0 && actions[index - 1]?.group !== action.group ? (
              <Separator orientation="vertical" className="mx-1 h-5" />
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={action.active ? "secondary" : "ghost"}
                  size="icon-sm"
                  tabIndex={-1}
                  aria-label={action.label}
                  aria-pressed={action.active}
                  disabled={action.disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={action.run}
                >
                  {action.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{action.label}</TooltipContent>
            </Tooltip>
          </Fragment>
        ))}
      </div>
    </TooltipProvider>
  );
}

export const EDITOR_ROOT_ATTRIBUTE = "data-tiptap-editor-root";

/**
 * Toolbar buttons sit outside the Tab order so Tab moves between fields, not
 * through every formatting command. Alt+F10 in the text enters the toolbar
 * (the CKEditor/TinyMCE convention). Returns whether the key was handled.
 * @example handleKeyDown: (view, event) => focusToolbarOnShortcut(event, view.dom)
 */
export function focusToolbarOnShortcut(
  event: Pick<KeyboardEvent, "altKey" | "key" | "preventDefault">,
  editorText: Element,
): boolean {
  if (!event.altKey || event.key !== "F10") return false;
  const firstButton = editorText
    .closest(`[${EDITOR_ROOT_ATTRIBUTE}]`)
    ?.querySelector<HTMLButtonElement>(
      '[role="toolbar"] button:not(:disabled)',
    );
  if (!firstButton) return false;
  event.preventDefault();
  firstButton.focus();
  return true;
}

/** Roving focus inside the toolbar, per the WAI-ARIA toolbar pattern. */
function moveToolbarFocus(event: React.KeyboardEvent<HTMLDivElement>) {
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)",
    ),
  );
  const target = pickToolbarButton(buttons, event.key);
  if (!target) return;
  event.preventDefault();
  target.focus();
}

function pickToolbarButton(
  buttons: HTMLButtonElement[],
  key: string,
): HTMLButtonElement | undefined {
  const active = document.activeElement;
  const index =
    active instanceof HTMLButtonElement ? buttons.indexOf(active) : -1;
  const count = buttons.length;
  if (key === "ArrowRight") return buttons[(index + 1) % count];
  if (key === "ArrowLeft") return buttons[(index - 1 + count) % count];
  if (key === "Home") return buttons[0];
  if (key === "End") return buttons.at(-1);
  return undefined;
}
