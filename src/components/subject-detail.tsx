"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BookOpen, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteSubjectDialog } from "@/components/delete-subject-dialog";
import { EditSubjectDialog } from "@/components/edit-subject-dialog";
import { Button } from "@/components/ui/button";

interface SubjectDetailProps {
  subject: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function SubjectDetail({ subject }: Readonly<SubjectDetailProps>) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleDeleteOpenChange(open: boolean) {
    setDeleteOpen(open);
    if (!open) {
      router.push("/subjects");
    }
  }

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
              <span>
                Updated {formatDistanceToNow(new Date(subject.updatedAt))}
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

      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Notes will appear here once implemented.
        </p>
      </div>

      <EditSubjectDialog
        subject={subject}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteSubjectDialog
        subjectId={subject.id}
        subjectName={subject.name}
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
      />
    </div>
  );
}
