"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteNoteDialog } from "@/components/delete-note-dialog";
import { EditNoteDialog } from "@/components/edit-note-dialog";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Button } from "@/components/ui/button";

interface NoteDetailProps {
  note: {
    id: string;
    title: string;
    content: string | null;
    subjectId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function NoteDetail({ note }: Readonly<NoteDetailProps>) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/subjects/${note.subjectId}`}>
            <ArrowLeft className="size-4" />
            Back to Subject
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{note.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
              <span>
                Created {formatDistanceToNow(new Date(note.createdAt))}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        {note.content ? (
          <MarkdownRenderer content={note.content} className="text-sm" />
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No content yet. Click Edit to add some notes.
          </p>
        )}
      </div>

      <EditNoteDialog note={note} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteNoteDialog
        noteId={note.id}
        noteTitle={note.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          setDeleteOpen(false);
          router.push(`/subjects/${note.subjectId}`);
        }}
      />
    </div>
  );
}
