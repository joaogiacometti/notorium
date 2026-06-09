"use client";

import { FileText, MoreVertical, Pencil, Trash2, Workflow } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { CreateDocumentMenu } from "@/components/documents/create-document-menu";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  DocumentKind,
  DocumentListItem,
} from "@/features/documents/types";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";
import { cn } from "@/lib/utils";

interface DocumentsSidebarProps {
  subjectId: string;
  items: DocumentListItem[];
  activeId?: string;
  activeKind?: DocumentKind;
  onDeleteRequested?: (item: DocumentListItem) => void;
  onEditRequested?: (item: DocumentListItem) => void;
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
  items,
  activeId,
  activeKind,
  onDeleteRequested,
  onEditRequested,
  onNavigate,
}: Readonly<DocumentsSidebarProps>) {
  return (
    <aside className="min-w-0 border-border bg-transparent lg:flex lg:min-h-0 lg:flex-col lg:border-r">
      <div className="border-b border-border/60 p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Documents
            </p>
          </div>
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
            const canEdit = !!onEditRequested;
            const canShowActions = canEdit || onDeleteRequested;

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
                      {canEdit ? (
                        <DropdownMenuItem
                          onClick={() => onEditRequested(item)}
                          className="cursor-pointer"
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      {onDeleteRequested ? (
                        <DropdownMenuItem
                          onClick={() => onDeleteRequested(item)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}
