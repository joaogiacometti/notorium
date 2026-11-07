"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface TiptapTableControlsProps {
  editor: Editor;
}

export type TableAction = {
  label: string;
  icon: React.ReactNode;
  command: () => void;
  destructive?: boolean;
};

/**
 * Returns the ordered list of table manipulation actions for the bubble menu.
 * @example const actions = buildTableActions(editor)
 */
export function buildTableActions(editor: Editor): TableAction[] {
  const chain = () => editor.chain().focus();
  return [
    {
      label: "Add row above",
      icon: <ArrowUp className="size-3.5" />,
      command: () => chain().addRowBefore().run(),
    },
    {
      label: "Add row below",
      icon: <ArrowDown className="size-3.5" />,
      command: () => chain().addRowAfter().run(),
    },
    {
      label: "Add column left",
      icon: <ArrowLeft className="size-3.5" />,
      command: () => chain().addColumnBefore().run(),
    },
    {
      label: "Add column right",
      icon: <ArrowRight className="size-3.5" />,
      command: () => chain().addColumnAfter().run(),
    },
    {
      label: "Delete row",
      icon: <Trash2 className="size-3.5" />,
      command: () => chain().deleteRow().run(),
      destructive: true,
    },
    {
      label: "Delete column",
      icon: <Trash2 className="size-3.5" />,
      command: () => chain().deleteColumn().run(),
      destructive: true,
    },
    {
      label: "Delete table",
      icon: <Trash2 className="size-3.5" />,
      command: () => chain().deleteTable().run(),
      destructive: true,
    },
  ];
}

/** Bubble menu that appears when the cursor is inside a table cell. */
export function TiptapTableControls({ editor }: TiptapTableControlsProps) {
  const actions = buildTableActions(editor);
  const insertActions = actions.filter((a) => !a.destructive);
  const deleteActions = actions.filter((a) => a.destructive);

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={() => editor.isActive("table")}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {insertActions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="ghost"
          size="icon-sm"
          title={action.label}
          aria-label={action.label}
          onClick={action.command}
        >
          {action.icon}
        </Button>
      ))}
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      {deleteActions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="ghost"
          size="icon-sm"
          title={action.label}
          aria-label={action.label}
          onClick={action.command}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {action.icon}
        </Button>
      ))}
    </BubbleMenu>
  );
}
