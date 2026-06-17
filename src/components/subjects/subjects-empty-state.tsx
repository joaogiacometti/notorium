"use client";

import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { Button } from "@/components/ui/button";

/**
 * Landing shown when the user has no subjects yet. The app otherwise always
 * opens a subject, so this is the one intentional "nothing selected" screen and
 * leads straight into creating the first subject.
 */
export function SubjectsEmptyState() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
      <div className="flex max-w-sm flex-col items-center gap-4 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Create your first subject
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Subjects hold your notes, mindmaps, and study tracking. Add one to
            get started.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          New subject
        </Button>
      </div>
      <CreateSubjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </main>
  );
}
