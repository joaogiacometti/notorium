"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BookOpen, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssessmentsOverview } from "@/components/assessments-overview";
import { AttendanceSummary } from "@/components/attendance-summary";
import { DeleteSubjectDialog } from "@/components/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/edit-subject-dialog";
import { NotesList } from "@/components/notes-list";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  AssessmentEntity,
  AttendanceMissEntity,
  NoteEntity,
  SubjectEntity,
} from "@/lib/api/contracts";

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
          <Link href="/subjects">
            <ArrowLeft className="size-4" />
            Back to Subjects
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold tracking-tight">
              {subject.name}
            </h1>
            {subject.description && (
              <p className="mt-1.5 break-words text-sm text-muted-foreground">
                {subject.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
              <span>
                Created{" "}
                {formatDistanceToNow(new Date(subject.createdAt), {
                  addSuffix: true,
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
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground sm:flex-none"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {subject.attendanceEnabled && (
        <AttendanceSummary
          subjectId={subject.id}
          totalClasses={subject.totalClasses}
          maxMisses={subject.maxMisses}
          misses={misses}
        />
      )}

      {subject.gradesEnabled && (
        <>
          <Separator className="my-8" />
          <AssessmentsOverview
            subjectId={subject.id}
            assessments={assessments}
          />
        </>
      )}

      {subject.notesEnabled && (
        <>
          <Separator className="my-8" />
          <NotesList subjectId={subject.id} notes={notes} />
        </>
      )}

      <EditSubjectDialog
        subject={subject}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteSubjectDialog
        subjectId={subject.id}
        subjectName={subject.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          setDeleteOpen(false);
          router.push("/subjects");
        }}
      />
    </div>
  );
}
