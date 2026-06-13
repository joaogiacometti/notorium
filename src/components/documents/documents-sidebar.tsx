"use client";

import {
  Clipboard,
  FileText,
  ImageDown,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { CreateDocumentMenu } from "@/components/documents/create-document-menu";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  DocumentKind,
  DocumentListItem,
} from "@/features/documents/types";
import type { NoteCopyFormat } from "@/lib/clipboard/note-content";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import { cn } from "@/lib/utils";

interface DocumentRowActionHandlers {
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

interface DocumentsSidebarProps extends DocumentRowActionHandlers {
  subjectId: string;
  subjectName: string;
  items: DocumentListItem[];
  activeId?: string;
  activeKind?: DocumentKind;
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
}

function countByKind(items: DocumentListItem[], kind: DocumentKind) {
  return items.filter((item) => item.kind === kind).length;
}

/**
 * Unified notes + mindmaps navigation for the subject documents area. Each row
 * shows a type icon so notes and mindmaps stay distinguishable in one list.
 *
 * @example
 * <DocumentsSidebar subjectId={subject.id} items={documents} activeId={note.id} activeKind="note" />
 */
export function DocumentsSidebar({
  subjectId,
  subjectName: _subjectName,
  items,
  activeId,
  activeKind,
  onNavigate,
  ...rowActions
}: Readonly<DocumentsSidebarProps>) {
  return (
    <aside className="min-w-0 border-border bg-transparent lg:flex lg:min-h-0 lg:flex-col lg:border-r">
      <div className="border-b border-border/60 p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Documents
          </p>
          <CreateDocumentMenu
            subjectId={subjectId}
            noteCount={countByKind(items, "note")}
            mindmapCount={countByKind(items, "mindmap")}
          />
        </div>
      </div>
      <nav
        aria-label="Subject documents"
        className="flex gap-2 overflow-x-auto !bg-transparent p-3 !shadow-none lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto"
      >
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
            No documents yet
          </div>
        ) : (
          items.map((item) => {
            const href = getDocumentDetailHref(item);
            const isActive = item.id === activeId && item.kind === activeKind;
            const Icon = item.kind === "mindmap" ? Workflow : FileText;
            const canShowActions =
              rowActions.onEditRequested || rowActions.onDeleteRequested;

            return (
              <div
                key={`${item.kind}-${item.id}`}
                className={cn(
                  "group flex min-w-36 items-center gap-1 rounded-md transition-colors sm:min-w-40 lg:min-w-0",
                  isActive
                    ? "bg-muted/45 text-foreground"
                    : "text-muted-foreground hover:bg-muted/35 hover:text-foreground",
                )}
              >
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => {
                    if (isActive) {
                      return;
                    }
                    onNavigate?.(href, event);
                  }}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2.5 text-left",
                    "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="block min-w-0 truncate text-sm font-medium">
                    {item.title}
                  </span>
                </Link>
                {canShowActions ? (
                  <DocumentRowMenu item={item} {...rowActions} />
                ) : null}
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}

interface DocumentRowMenuProps extends DocumentRowActionHandlers {
  item: DocumentListItem;
}

/** Kebab menu for one sidebar row, mirroring the detail header menu of the
 * same document kind so both entry points expose identical actions. */
function DocumentRowMenu({
  item,
  ...handlers
}: Readonly<DocumentRowMenuProps>) {
  const kindItems =
    item.kind === "note" ? (
      <NoteRowMenuItems item={item} {...handlers} />
    ) : (
      <MindmapRowMenuItems item={item} {...handlers} />
    );

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
