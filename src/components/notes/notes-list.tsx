"use client";

import { Lock, Plus } from "lucide-react";
import { useState } from "react";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { EditNoteDialog } from "@/components/notes/edit-note-dialog";
import { NoteCard } from "@/components/notes/note-card";
import { Button } from "@/components/ui/button";
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

export function NotesList({ subjectId, notes }: Readonly<NotesListProps>) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NoteEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NoteDeleteTarget | null>(
    null,
  );
  const warningTone = getStatusToneClasses("warning");

  const isAtLimit = notes.length >= LIMITS.maxNotesPerSubject;

  function getNoteCountText() {
    if (notes.length === 0) {
      return "Capture what you learn, one note at a time.";
    }
    return `${notes.length}/${LIMITS.maxNotesPerSubject} notes`;
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
              disabled={isAtLimit}
              title={
                isAtLimit
                  ? "You cannot create more notes for this subject"
                  : undefined
              }
            >
              <Plus className="size-4" />
              <span>New Note</span>
            </Button>
          }
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
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
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEditRequested={() => setEditTarget(n)}
              onDeleteRequested={() =>
                setDeleteTarget({ id: n.id, title: n.title })
              }
            />
          ))}
        </div>
      )}

      {editTarget && (
        <EditNoteDialog
          note={editTarget}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
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
        />
      )}
    </div>
  );
}
