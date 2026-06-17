"use client";

import { FileText, MoreVertical, Pencil, Trash2, Workflow } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteMindmapDialog } from "@/components/mindmaps/delete-mindmap-dialog";
import { EditMindmapTitleDialog } from "@/components/mindmaps/edit-mindmap-title-dialog";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { EditNoteTitleDialog } from "@/components/notes/edit-note-title-dialog";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentListItem } from "@/features/documents/types";
import { formatRelativeTime } from "@/lib/dates/format";
import { getDocumentDetailHref } from "@/lib/navigation/detail-page-back-link";

interface DocumentsListProps {
  documents: DocumentListItem[];
}

export function DocumentsList({ documents }: Readonly<DocumentsListProps>) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<DocumentListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentListItem | null>(
    null,
  );

  return (
    <div>
      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold">No documents yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by creating a note or a mindmap.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {documents.map((item) => {
            const Icon = item.kind === "mindmap" ? Workflow : FileText;

            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/35"
              >
                <Link
                  href={getDocumentDetailHref(item)}
                  aria-label={`Open ${item.title}`}
                  className="flex min-w-0 flex-1 items-start gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.kind === "mindmap" ? "Mindmap" : "Note"} · Updated{" "}
                      {formatRelativeTime(item.updatedAt)}
                    </span>
                  </span>
                </Link>
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
                    <DropdownMenuItem
                      onSelect={() => setEditTarget(item)}
                      className="cursor-pointer"
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setDeleteTarget(item)}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {editTarget?.kind === "note" ? (
        <EditNoteTitleDialog
          note={{ id: editTarget.id, title: editTarget.title }}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSuccess={() => {
            setEditTarget(null);
            router.refresh();
          }}
        />
      ) : null}
      {editTarget?.kind === "mindmap" ? (
        <EditMindmapTitleDialog
          mindmap={{ id: editTarget.id, title: editTarget.title }}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSuccess={(_newTitle) => {
            setEditTarget(null);
            router.refresh();
          }}
        />
      ) : null}
      {deleteTarget?.kind === "note" ? (
        <DeleteNoteDialog
          noteId={deleteTarget.id}
          noteTitle={deleteTarget.title}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={() => {
            setDeleteTarget(null);
            router.refresh();
          }}
        />
      ) : null}
      {deleteTarget?.kind === "mindmap" ? (
        <DeleteMindmapDialog
          mindmapId={deleteTarget.id}
          mindmapTitle={deleteTarget.title}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={() => {
            setDeleteTarget(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
