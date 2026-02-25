"use client";

import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { CreateSubjectDialog } from "@/components/create-subject-dialog";
import { SubjectCard } from "@/components/subject-card";
import { Button } from "@/components/ui/button";
import type { SubjectEntity } from "@/lib/api/contracts";

interface SubjectsListProps {
  subjects: SubjectEntity[];
}

export function SubjectsList({ subjects }: Readonly<SubjectsListProps>) {
  const [createOpen, setCreateOpen] = useState(false);

  function getSubjectCountText() {
    if (subjects.length === 0) {
      return "Get started by creating your first subject.";
    }
    return `${subjects.length} subject${subjects.length === 1 ? "" : "s"}`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {getSubjectCountText()}
          </p>
        </div>
        <CreateSubjectDialog
          trigger={
            <Button className="gap-1.5" id="btn-create-subject">
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Subject</span>
            </Button>
          }
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-20">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="size-6 text-primary" />
          </div>
          <h2 className="mb-1 text-lg font-semibold">No subjects yet</h2>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            Create your first subject to start organizing your notes and
            tracking your academic progress.
          </p>
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create Subject
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subj) => (
            <SubjectCard key={subj.id} subject={subj} />
          ))}
        </div>
      )}
    </div>
  );
}
