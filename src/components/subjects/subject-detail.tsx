"use client";

import { formatDistanceToNow } from "date-fns";
import { Archive, ArrowLeft, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { NotesList } from "@/components/notes/notes-list";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { SubjectText } from "@/components/shared/subject-text";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/subjects/edit-subject-dialog";
import { SubjectAssessmentsSummary } from "@/components/subjects/subject-assessments-summary";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "@/i18n/routing";
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
        </>
      }
      backHref="/subjects"
      backIcon={ArrowLeft}
      backLabel={t("back")}
      description={subject.description}
      meta={
        <span>
          {t("created")}{" "}
          {formatDistanceToNow(new Date(subject.createdAt), {
            addSuffix: true,
            locale: dateLocale,
          })}
        </span>
      }
      title={<SubjectText value={subject.name} mode="wrap" />}
      titleIcon={BookOpen}
    >
      <AttendanceSummary
        subjectId={subject.id}
        totalClasses={subject.totalClasses}
        maxMisses={subject.maxMisses}
        misses={misses}
      />

      <Separator className="my-8" />
      <SubjectAssessmentsSummary
        assessments={assessments}
        subjectId={subject.id}
      />

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
    </DetailPageLayout>
  );
}
