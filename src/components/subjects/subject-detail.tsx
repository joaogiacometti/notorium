"use client";

import { formatDistanceToNow } from "date-fns";
import { Archive, ArrowLeft, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AssessmentsOverview } from "@/components/assessments/assessments-overview";
import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { NotesList } from "@/components/notes/notes-list";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { SubjectText } from "@/components/shared/subject-text";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link, useRouter } from "@/i18n/routing";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  NoteEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

interface SubjectDetailProps {
  subject: SubjectEntity;
  notes: NoteEntity[];
  misses: AttendanceMissEntity[];
  assessments: AssessmentEntity[];
}

export function SubjectDetail({
  subject,
  notes,
  misses,
  assessments,
}: Readonly<SubjectDetailProps>) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations("SubjectDetail");
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <AppPageContainer maxWidth="3xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/subjects">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              <SubjectText value={subject.name} mode="wrap" />
            </h1>
            {subject.description && (
              <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
                {subject.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
              <span>
                {t("created")}{" "}
                {formatDistanceToNow(new Date(subject.createdAt), {
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
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setArchiveOpen(true)}
          >
            <Archive className="size-3.5" />
            {t("archive")}
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

      <AttendanceSummary
        subjectId={subject.id}
        totalClasses={subject.totalClasses}
        maxMisses={subject.maxMisses}
        misses={misses}
      />

      <Separator className="my-8" />
      <AssessmentsOverview subjectId={subject.id} assessments={assessments} />

      <Separator className="my-8" />
      <NotesList subjectId={subject.id} notes={notes} />

      <EditSubjectDialog
        subject={subject}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteSubjectDialog
        subjectId={subject.id}
        subjectName={subject.name}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        mode="archive"
        onSuccess={() => {
          setArchiveOpen(false);
          router.push("/subjects");
        }}
      />
      <DeleteSubjectDialog
        subjectId={subject.id}
        subjectName={subject.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        mode="delete"
        onSuccess={() => {
          setDeleteOpen(false);
          router.push("/subjects");
        }}
      />
    </AppPageContainer>
  );
}
