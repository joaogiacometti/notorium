"use client";

import {
  FileText,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateNoteTitleDialog } from "@/components/notes/create-note-title-dialog";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { EditNoteTitleDialog } from "@/components/notes/edit-note-title-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getNoteContentPreview } from "@/features/notes/excerpts";
import { LIMITS } from "@/lib/config/limits";
import type { NoteEntity } from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface NotesListProps {
  subjectId: string;
  notes: NoteEntity[];
}

type NoteDeleteTarget = {
  id: string;
  title: string;
};

const SUBJECT_NOTE_PREVIEW_COUNT = 3;

export function NotesList({ subjectId, notes }: Readonly<NotesListProps>) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NoteEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NoteDeleteTarget | null>(
    null,
  );
  const warningTone = getStatusToneClasses("warning");

  const isAtLimit = notes.length >= LIMITS.maxNotesPerSubject;
  const previewNotes = notes.slice(0, SUBJECT_NOTE_PREVIEW_COUNT);
  const hasMoreNotes = notes.length > SUBJECT_NOTE_PREVIEW_COUNT;
  const fullNotesHref = `/subjects/${subjectId}/notes`;

  function getNoteCountText() {
    if (notes.length === 0) {
      return "Capture what you learn, one note at a time.";
    }
    return `${notes.length}/${LIMITS.maxNotesPerSubject} notes`;
  }

  const createButton = (
    <Button
      size="sm"
      className="w-full gap-1.5 sm:w-auto"
      id="btn-create-note"
      disabled={isAtLimit}
    >
      <Plus className="size-4" />
      <span>New</span>
    </Button>
  );

  return (
    <TooltipProvider>
      <div>
        <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Notes</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {getNoteCountText()}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {notes.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 sm:flex-none"
                asChild
              >
                <Link href={fullNotesHref}>View all -&gt;</Link>
              </Button>
            ) : null}
            <CreateNoteTitleDialog
              subjectId={subjectId}
              trigger={
                isAtLimit ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex flex-1 sm:flex-none"
                        data-testid="new-note-disabled-trigger"
                      >
                        {createButton}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Delete an existing note to create a new one.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  createButton
                )
              }
              open={createOpen}
              onOpenChange={setCreateOpen}
              onSuccess={(noteId) => {
                router.push(`/subjects/${subjectId}/notes/${noteId}`);
              }}
            />
          </div>
        </div>

        {isAtLimit && (
          <div
            className={`mb-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${warningTone.border} ${warningTone.bg}`}
          >
            <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
            <p className={warningTone.text}>
              {`You've reached the limit of ${LIMITS.maxNotesPerSubject} notes per subject. Please delete existing ones to create more.`}
            </p>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 sm:p-6">
            <div>
              <h3 className="text-base font-semibold">No notes yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start by creating your first note.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {previewNotes.map((n) => (
              <div
                key={n.id}
                className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/35"
              >
                <Link
                  href={`/subjects/${n.subjectId}/notes/${n.id}`}
                  aria-label={`Open ${n.title}`}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {n.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {getNoteContentPreview(n.content)}
                    </span>
                  </span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 data-[state=open]:opacity-100"
                      aria-label={`Open actions for ${n.title}`}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setEditTarget(n)}
                      className="cursor-pointer"
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        setDeleteTarget({ id: n.id, title: n.title })
                      }
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {hasMoreNotes ? (
              <Button
                variant="outline"
                className="mt-3 w-full border-dashed"
                asChild
              >
                <Link href={fullNotesHref}>
                  View all {notes.length} notes -&gt;
                </Link>
              </Button>
            ) : null}
          </div>
        )}

        {editTarget && (
          <EditNoteTitleDialog
            note={editTarget}
            open
            onOpenChange={(open) => {
              if (!open) setEditTarget(null);
            }}
            onSuccess={() => {
              router.refresh();
            }}
          />
        )}
        {deleteTarget && (
          <DeleteNoteDialog
            noteId={deleteTarget.id}
            noteTitle={deleteTarget.title}
            open
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
            onSuccess={() => {
              router.refresh();
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
