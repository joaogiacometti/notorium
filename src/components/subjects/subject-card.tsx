"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Archive,
  BookOpen,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { CreateFlashcardDialog } from "@/components/flashcards/create-flashcard-dialog";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type { SubjectEntity } from "@/lib/server/api-contracts";

interface SubjectCardProps {
  subject: SubjectEntity;
}

export function SubjectCard({ subject }: Readonly<SubjectCardProps>) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations("SubjectCard");
  const [editOpen, setEditOpen] = useState(false);
  const [createFlashcardOpen, setCreateFlashcardOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card className="group relative transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <Link
            href={`/subjects/${subject.id}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <BookOpen className="size-4" />
            </div>
            <CardTitle className="truncate text-base leading-tight">
              {subject.name}
            </CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label={t("open_actions")}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setEditOpen(true)}
                className="cursor-pointer"
              >
                <Pencil className="size-4" />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCreateFlashcardOpen(true)}
                className="cursor-pointer"
              >
                <FileText className="size-4" />
                {t("create_flashcard")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setArchiveOpen(true)}
                className="cursor-pointer"
              >
                <Archive className="size-4" />
                {t("archive")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <Link
          href={`/subjects/${subject.id}`}
          className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <CardContent className="pt-0">
            {subject.description && (
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {subject.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground/60">
              {t("created")}{" "}
              {formatDistanceToNow(new Date(subject.createdAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </p>
          </CardContent>
        </Link>
      </Card>

      <EditSubjectDialog
        subject={subject}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <CreateFlashcardDialog
        subjectId={subject.id}
        open={createFlashcardOpen}
        onOpenChange={setCreateFlashcardOpen}
      />
      <DeleteSubjectDialog
        subjectId={subject.id}
        subjectName={subject.name}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        mode="archive"
      />
      <DeleteSubjectDialog
        subjectId={subject.id}
        subjectName={subject.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        mode="delete"
      />
    </>
  );
}
