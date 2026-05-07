"use client";

import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState, useTransition } from "react";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LIMITS } from "@/lib/config/limits";
import { formatRelativeTime } from "@/lib/dates/format";
import type { NoteEntity } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface NoteSidebarProps {
  activeNoteId?: string;
  notes: NoteEntity[];
  onDeleteRequested?: (note: NoteEntity) => void;
  onEditRequested?: (note: NoteEntity) => void;
  onNoteNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  subjectId: string;
}

/**
 * Renders the subject note navigation used by note detail and the full notes list.
 *
 * @example
 * <NoteSidebar subjectId={subject.id} notes={notes} activeNoteId={note.id} />
 */
export function NoteSidebar({
  activeNoteId,
  notes,
  onDeleteRequested,
  onEditRequested,
  onNoteNavigate,
  subjectId,
}: Readonly<NoteSidebarProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const isAtNoteLimit = notes.length >= LIMITS.maxNotesPerSubject;

  return (
    <aside className="min-w-0 border-border bg-transparent lg:flex lg:min-h-0 lg:flex-col lg:border-r">
      <div className="border-b border-border/60 p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Notes
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {notes.length} notes
            </p>
          </div>
          <CreateNoteTitleDialog
            subjectId={subjectId}
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={(noteId) => {
              startNavTransition(() => {
                router.push(`/subjects/${subjectId}/notes/${noteId}`);
              });
            }}
            trigger={
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 gap-1.5 whitespace-nowrap px-3"
                aria-label="Create note"
                disabled={isAtNoteLimit}
                title={
                  isAtNoteLimit
                    ? "Delete an existing note to create a new one."
                    : undefined
                }
              >
                <Plus className="size-4" />
                <span>Create note</span>
              </Button>
            }
          />
        </div>
      </div>
      <nav
        aria-label="Subject notes"
        className="flex gap-2 overflow-x-auto !bg-transparent p-3 !shadow-none lg:block lg:min-h-0 lg:flex-1 lg:space-y-1 lg:overflow-y-auto"
      >
        {notes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
            No notes yet
          </div>
        ) : (
          notes.map((subjectNote) => {
            const href = `/subjects/${subjectNote.subjectId}/notes/${subjectNote.id}`;
            const isActive = subjectNote.id === activeNoteId;
            const canShowActions = onEditRequested || onDeleteRequested;

            return (
              <div
                key={subjectNote.id}
                className={cn(
                  "group flex min-w-36 items-start gap-1 rounded-md transition-colors sm:min-w-40 lg:min-w-0",
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
                    onNoteNavigate?.(href, event);
                  }}
                  className={cn(
                    "block min-w-0 flex-1 rounded-md px-3 py-2.5 text-left",
                    "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  )}
                >
                  <span className="block truncate text-sm font-medium">
                    {subjectNote.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground/70">
                    Updated {formatRelativeTime(subjectNote.updatedAt)}
                  </span>
                </Link>
                {canShowActions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className={`${ROW_ACTION_TRIGGER_CLASS} mt-1.5 shrink-0 text-muted-foreground`}
                        aria-label={`Open actions for ${subjectNote.title}`}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEditRequested ? (
                        <DropdownMenuItem
                          onClick={() => onEditRequested(subjectNote)}
                          className="cursor-pointer"
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      {onDeleteRequested ? (
                        <DropdownMenuItem
                          onClick={() => onDeleteRequested(subjectNote)}
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
