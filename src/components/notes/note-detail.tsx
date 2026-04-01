"use client";

import { ArrowLeft, FileText, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { LazyEditNoteDialog as EditNoteDialog } from "@/components/notes/lazy-edit-note-dialog";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/dates/format";
import type { NoteEntity } from "@/lib/server/api-contracts";

interface NoteDetailProps {
  backHref: string;
  backLabel: string;
  note: NoteEntity;
}

export function NoteDetail({
  backHref,
  backLabel,
  note,
}: Readonly<NoteDetailProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <DetailPageLayout
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground sm:flex-none"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </>
      }
      backHref={backHref}
      backIcon={ArrowLeft}
      backLabel={backLabel}
      meta={<span>Created {formatRelativeTime(note.createdAt)}</span>}
      title={note.title}
      titleIcon={FileText}
    >
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          {note.content ? (
            <TiptapRenderer
              content={note.content}
              className="min-w-0 wrap-break-word hyphens-auto text-sm sm:text-base"
            />
          ) : (
            <p className="text-sm italic text-muted-foreground sm:text-base">
              No content yet. Click Edit to add some notes.
            </p>
          )}
        </div>
      </div>

      <EditNoteDialog note={note} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteNoteDialog
        noteId={note.id}
        noteTitle={note.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          setDeleteOpen(false);
          startNavTransition(() => router.push(backHref));
        }}
      />
    </DetailPageLayout>
  );
}
