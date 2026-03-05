"use client";

import { Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateNoteDialog } from "@/components/create-note-dialog";
import { NoteCard } from "@/components/note-card";
import { Button } from "@/components/ui/button";
import type { NoteEntity } from "@/lib/api/contracts";
import { LIMITS } from "@/lib/limits";

interface NotesListProps {
  subjectId: string;
  notes: NoteEntity[];
}

export function NotesList({ subjectId, notes }: Readonly<NotesListProps>) {
  const t = useTranslations("NotesList");
  const [createOpen, setCreateOpen] = useState(false);

  const isAtLimit = notes.length >= LIMITS.maxNotesPerSubject;

  function getNoteCountText() {
    if (notes.length === 0) {
      return t("count_empty");
    }
    return t("count_with_limit", {
      count: notes.length,
      max: LIMITS.maxNotesPerSubject,
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
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
              title={isAtLimit ? t("limit_tooltip") : undefined}
            >
              <Plus className="size-4" />
              <span>{t("new_note")}</span>
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
            {t("limit_message", { max: LIMITS.maxNotesPerSubject })}
          </p>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold">{t("empty_title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty_description")}
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
