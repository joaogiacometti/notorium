"use client";

import {
  Clipboard,
  ImageDown,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentListItem } from "@/features/documents/types";
import type { NoteCopyFormat } from "@/lib/clipboard/note-content";

export interface DocumentRowActionHandlers {
  onEditRequested?: (item: DocumentListItem) => void;
  onDeleteRequested?: (item: DocumentListItem) => void;
  /** Notes only: copy the note's content in the given clipboard format. */
  onCopyRequested?: (item: DocumentListItem, format: NoteCopyFormat) => void;
  /** Mindmaps only: download the mindmap as a PNG. */
  onExportRequested?: (item: DocumentListItem) => void;
}

interface DocumentRowMenuProps extends DocumentRowActionHandlers {
  item: DocumentListItem;
}

/**
 * Kebab menu for one document row, mirroring the detail header menu of the same
 * document kind so every entry point (documents list, subject tree) exposes
 * identical actions.
 *
 * @example
 * <DocumentRowMenu item={doc} onEditRequested={openEdit} onDeleteRequested={openDelete} />
 */
export function DocumentRowMenu({
  item,
  ...handlers
}: Readonly<DocumentRowMenuProps>) {
  // Edit/Delete open dialogs. Defer the dialog open until the menu has
  // fully closed: while the dropdown plays its close animation it still traps
  // focus, so opening the dialog now would let that trap steal focus back from
  // the dialog's autofocused field. Running the action in onCloseAutoFocus (and
  // preventing the default trigger refocus) opens the dialog only once the menu
  // is gone, so its field keeps focus.
  const pendingActionRef = useRef<(() => void) | null>(null);
  function openDialog(action: () => void) {
    pendingActionRef.current = action;
  }

  let kindItems: React.ReactNode = null;
  if (item.kind === "note") {
    kindItems = <NoteRowMenuItems item={item} {...handlers} />;
  } else if (item.kind === "mindmap") {
    kindItems = <MindmapRowMenuItems item={item} {...handlers} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={`${ROW_ACTION_TRIGGER_CLASS} shrink-0 text-muted-foreground`}
          aria-label={`Open actions for ${item.title}`}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          const action = pendingActionRef.current;
          if (action) {
            pendingActionRef.current = null;
            event.preventDefault();
            action();
          }
        }}
      >
        {handlers.onEditRequested ? (
          <DropdownMenuItem
            onClick={() => openDialog(() => handlers.onEditRequested?.(item))}
            className="cursor-pointer"
          >
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {kindItems}
        {handlers.onDeleteRequested ? (
          <DropdownMenuItem
            onClick={() => openDialog(() => handlers.onDeleteRequested?.(item))}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NoteRowMenuItems({
  item,
  onCopyRequested,
}: Readonly<DocumentRowMenuProps>) {
  if (!onCopyRequested) {
    return null;
  }
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="cursor-pointer"
        onClick={() => onCopyRequested(item, "rich")}
      >
        <Clipboard className="size-4" />
        Copy as rich text
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer"
        onClick={() => onCopyRequested(item, "plain")}
      >
        <Clipboard className="size-4" />
        Copy as plain text
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}

function MindmapRowMenuItems({
  item,
  onExportRequested,
}: Readonly<DocumentRowMenuProps>) {
  if (!onExportRequested) {
    return null;
  }
  return (
    <>
      <DropdownMenuItem
        className="cursor-pointer"
        onClick={() => onExportRequested(item)}
      >
        <ImageDown className="size-4" />
        Export as PNG
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
