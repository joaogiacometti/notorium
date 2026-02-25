"use client";

import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { CreateNoteDialog } from "@/components/create-note-dialog";
import { NoteCard } from "@/components/note-card";
import { Button } from "@/components/ui/button";
import type { NoteEntity } from "@/lib/api/contracts";

interface NotesListProps {
  subjectId: string;
  notes: NoteEntity[];
}

export function NotesList({ subjectId, notes }: Readonly<NotesListProps>) {
  const [createOpen, setCreateOpen] = useState(false);

  function getNoteCountText() {
    if (notes.length === 0) {
      return "Get started by creating your first note.";
    }
    return `${notes.length} note${notes.length === 1 ? "" : "s"}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Notes</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {getNoteCountText()}
          </p>
        </div>
        <CreateNoteDialog
          subjectId={subjectId}
          trigger={
            <Button size="sm" className="gap-1.5" id="btn-create-note">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Note</span>
            </Button>
          }
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-16">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <FileText className="size-6 text-primary" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No notes yet</h3>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            Create your first note to start recording what you learn in this
            subject.
          </p>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Create Note
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
