"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, FileText, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { EditNoteDialog } from "@/components/notes/edit-note-dialog";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { TiptapRenderer } from "@/components/shared/tiptap-renderer";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type { NoteEntity } from "@/lib/server/api-contracts";

interface NoteDetailProps {
  note: NoteEntity;
}

export function NoteDetail({ note }: Readonly<NoteDetailProps>) {
  const t = useTranslations("NoteDetail");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const router = useRouter();
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
        </>
      }
      backHref={`/subjects/${note.subjectId}`}
      backIcon={ArrowLeft}
      backLabel={t("back")}
      meta={
        <span>
          {t("created_label")}
          {formatDistanceToNow(new Date(note.createdAt), {
            addSuffix: true,
            locale: dateLocale,
          })}
        </span>
      }
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
              {t("empty")}
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
          router.push(`/subjects/${note.subjectId}`);
        }}
      />
    </DetailPageLayout>
  );
}
