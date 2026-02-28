"use client";

import { Lock, Plus } from "lucide-react";
import { useState } from "react";
import { CreateNoteDialog } from "@/components/create-note-dialog";
import { NoteCard } from "@/components/note-card";
import { Button } from "@/components/ui/button";
import type { NoteEntity } from "@/lib/api/contracts";
import { getPlanLimits } from "@/lib/plan-limits";

interface NotesListProps {
  subjectId: string;
  notes: NoteEntity[];
  plan: string;
}

export function NotesList({
  subjectId,
  notes,
  plan,
}: Readonly<NotesListProps>) {
  const [createOpen, setCreateOpen] = useState(false);

  const limits = getPlanLimits(plan === "unlimited" ? "unlimited" : "free");
  const isAtLimit =
    limits.maxNotesPerSubject !== null &&
    notes.length >= limits.maxNotesPerSubject;

  function getNoteCountText() {
    if (notes.length === 0) {
      return "Capture what you learn, one note at a time.";
    }
    if (limits.maxNotesPerSubject !== null) {
      return `${notes.length}/${limits.maxNotesPerSubject} notes`;
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
              disabled={isAtLimit}
              title={
                isAtLimit ? "Upgrade your plan to create more notes" : undefined
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
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            You&apos;ve reached the Free plan limit of{" "}
            {limits.maxNotesPerSubject} notes per subject. Upgrade your plan to
            create more.
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
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
