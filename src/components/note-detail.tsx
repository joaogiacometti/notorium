"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, FileText, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DeleteNoteDialog } from "@/components/delete-note-dialog";
import { EditNoteDialog } from "@/components/edit-note-dialog";
import { NoteImageAttachments } from "@/components/note-image-attachments";
import { TiptapRenderer } from "@/components/tiptap-renderer";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/routing";
import type { NoteWithAttachmentsEntity } from "@/lib/api/contracts";
import { getDateFnsLocale } from "@/lib/date-locale";
import type { UserPlan } from "@/lib/plan-limits";

interface NoteDetailProps {
  note: NoteWithAttachmentsEntity;
  plan: UserPlan;
}

export function NoteDetail({ note, plan }: Readonly<NoteDetailProps>) {
  const t = useTranslations("NoteDetail");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
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
            {t("back")}
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word text-2xl font-bold tracking-tight">
              {note.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
              <span>
                Created{" "}
                {formatDistanceToNow(new Date(note.createdAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            {t("edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground sm:flex-none"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            {t("delete")}
          </Button>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          {note.content ? (
            <TiptapRenderer
              content={note.content}
              className="min-w-0 break-all text-sm sm:text-base"
            />
          ) : (
            <p className="text-sm italic text-muted-foreground sm:text-base">
              {t("empty")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <NoteImageAttachments
          noteId={note.id}
          attachments={note.attachments}
          plan={plan}
        />
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
