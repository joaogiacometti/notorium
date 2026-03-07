"use client";

import { Archive, BookOpen, Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateSubjectDialog } from "@/components/create-subject-dialog";
import { SubjectCard } from "@/components/subject-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import type { SubjectEntity } from "@/lib/api/contracts";
import { LIMITS } from "@/lib/limits";
import { getTotalSubjectCount } from "@/lib/subjects-count";

interface SubjectsListProps {
  subjects: SubjectEntity[];
  archivedCount: number;
}

export function SubjectsList({
  subjects,
  archivedCount,
}: Readonly<SubjectsListProps>) {
  const t = useTranslations("SubjectsList");
  const [createOpen, setCreateOpen] = useState(false);

  const totalSubjects = getTotalSubjectCount(subjects.length, archivedCount);
  const isAtLimit = totalSubjects >= LIMITS.maxSubjects;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word hyphens-auto text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1.5 wrap-break-word hyphens-auto text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <Button variant="outline" className="gap-1.5" asChild>
            <Link href="/subjects/archived">
              <Archive className="size-4" />
              {t("archived")}
              {archivedCount > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {archivedCount}
                </span>
              ) : null}
            </Link>
          </Button>
          <CreateSubjectDialog
            trigger={
              <Button
                className="gap-1.5"
                id="btn-create-subject"
                disabled={isAtLimit}
                title={isAtLimit ? t("limit_tooltip") : undefined}
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">{t("new_subject")}</span>
              </Button>
            }
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
        </div>
      </div>

      {isAtLimit && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            {t("limit_message", { max: LIMITS.maxSubjects })}
          </p>
        </div>
      )}

      {subjects.length === 0 && archivedCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-20">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="size-6 text-primary" />
          </div>
          <h2 className="mb-1 text-lg font-semibold">{t("empty_title")}</h2>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            {t("empty_description")}
          </p>
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t("create_subject")}
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
