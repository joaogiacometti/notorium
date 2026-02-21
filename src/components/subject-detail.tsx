"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BookOpen, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AttendanceSummary } from "@/components/attendance-summary";
import { DeleteSubjectDialog } from "@/components/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/edit-subject-dialog";
import { GradesSummary } from "@/components/grades-summary";
import { NotesList } from "@/components/notes-list";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Note {
  id: string;
  title: string;
  content: string | null;
  subjectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AttendanceMiss {
  id: string;
  missDate: string;
  subjectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Grade {
  id: string;
  name: string;
  value: string;
  categoryId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GradeCategory {
  id: string;
  name: string;
  weight: string | null;
  subjectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  grades: Grade[];
}

interface SubjectDetailProps {
  subject: {
    id: string;
    name: string;
    description: string | null;
    totalClasses: number | null;
    maxMisses: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  notes: Note[];
  misses: AttendanceMiss[];
  gradeCategories: GradeCategory[];
}

export function SubjectDetail({
  subject,
  notes,
  misses,
  gradeCategories,
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

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {subject.name}
            </h1>
            {subject.description && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {subject.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
              <span>
                Created {formatDistanceToNow(new Date(subject.createdAt))}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
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

      <GradesSummary subjectId={subject.id} categories={gradeCategories} />

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
