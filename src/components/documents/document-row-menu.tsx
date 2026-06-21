"use client";

import {
  Clipboard,
  ImageDown,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import type React from "react";
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
  /** Notes and mindmaps: open the AI flashcard generation dialog. */
  onGenerateRequested?: (item: DocumentListItem) => void;
  /** When set, the generate item renders disabled with this as its tooltip. */
  generateDisabledReason?: string;
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
  // Books carry no kind-specific actions; only the shared Edit/Delete apply.
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
      <DropdownMenuContent align="end">
        {handlers.onEditRequested ? (
          <DropdownMenuItem
            onClick={() => handlers.onEditRequested?.(item)}
            className="cursor-pointer"
          >
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {kindItems}
        {handlers.onDeleteRequested ? (
          <DropdownMenuItem
            onClick={() => handlers.onDeleteRequested?.(item)}
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
  onGenerateRequested,
  generateDisabledReason,
  onCopyRequested,
}: Readonly<DocumentRowMenuProps>) {
  return (
    <>
      {onGenerateRequested ? (
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={!!generateDisabledReason}
          title={generateDisabledReason}
          onClick={() => onGenerateRequested(item)}
        >
          <Sparkles className="size-4" />
          Generate flashcards
        </DropdownMenuItem>
      ) : null}
      {onCopyRequested ? (
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
      ) : null}
    </>
  );
}

function MindmapRowMenuItems({
  item,
  onGenerateRequested,
  generateDisabledReason,
  onExportRequested,
}: Readonly<DocumentRowMenuProps>) {
  if (!onGenerateRequested && !onExportRequested) {
    return null;
  }
  return (
    <>
      {onGenerateRequested ? (
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={!!generateDisabledReason}
          title={generateDisabledReason}
          onClick={() => onGenerateRequested(item)}
        >
          <Sparkles className="size-4" />
          Generate flashcards
        </DropdownMenuItem>
      ) : null}
      {onExportRequested ? (
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => onExportRequested(item)}
        >
          <ImageDown className="size-4" />
          Export as PNG
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
    </>
  );
}
