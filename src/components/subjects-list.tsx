"use client";

import { BookOpen, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { CreateSubjectDialog } from "@/components/create-subject-dialog";
import { SubjectCard } from "@/components/subject-card";
import { Button } from "@/components/ui/button";
import type { SubjectEntity } from "@/lib/api/contracts";
import { getPlanLimits } from "@/lib/plan-limits";

interface SubjectsListProps {
  subjects: SubjectEntity[];
  plan: string;
}

export function SubjectsList({ subjects, plan }: Readonly<SubjectsListProps>) {
  const [createOpen, setCreateOpen] = useState(false);

  const limits = getPlanLimits(plan === "unlimited" ? "unlimited" : "free");
  const isAtLimit =
    limits.maxSubjects !== null && subjects.length >= limits.maxSubjects;

  function getSubjectCountText() {
    if (subjects.length === 0) {
      return "Get started by creating your first subject.";
    }
    if (limits.maxSubjects !== null) {
      return `${subjects.length}/${limits.maxSubjects} subjects`;
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
            <Button
              className="gap-1.5"
              id="btn-create-subject"
              disabled={isAtLimit}
              title={
                isAtLimit
                  ? "Upgrade your plan to create more subjects"
                  : undefined
              }
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Subject</span>
            </Button>
          }
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </div>

      {isAtLimit && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            You&apos;ve reached the Free plan limit of {limits.maxSubjects}{" "}
            subjects. Upgrade your plan to create more.
          </p>
        </div>
      )}

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
