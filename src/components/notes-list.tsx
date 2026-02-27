"use client";

import { Plus } from "lucide-react";
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
      return "Capture what you learn, one note at a time.";
    }
    return `${notes.length} note${notes.length === 1 ? "" : "s"}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Notes</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {getNoteCountText()}
          </p>
        </div>
        <CreateNoteDialog
          subjectId={subjectId}
          trigger={
            <Button
              size="sm"
              className="w-full gap-1.5 sm:w-auto"
              id="btn-create-note"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Note</span>
            </Button>
          }
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
