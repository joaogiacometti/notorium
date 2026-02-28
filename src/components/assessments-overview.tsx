"use client";

import { Lock, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AssessmentItemCard } from "@/components/assessment-item-card";
import { CreateAssessmentDialog } from "@/components/create-assessment-dialog";
import { DeleteAssessmentDialog } from "@/components/delete-assessment-dialog";
import { EditAssessmentDialog } from "@/components/edit-assessment-dialog";
import { Button } from "@/components/ui/button";
import type { AssessmentEntity } from "@/lib/api/contracts";
import {
  getAssessmentAverage,
  getTodayIso,
  isAssessmentOverdue,
} from "@/lib/assessments";
import { getPlanLimits, type UserPlan } from "@/lib/plan-limits";
import { getScoreTone, getStatusToneClasses } from "@/lib/status-tones";

interface AssessmentsOverviewProps {
  subjectId: string;
  assessments: AssessmentEntity[];
  plan: UserPlan;
}

function getAverageTone(value: number): string {
  const tone = getStatusToneClasses(getScoreTone(value));
  return `${tone.border} ${tone.bg} ${tone.text}`;
}

function getAverageMeta(value: number): { label: string; barClass: string } {
  const tone = getScoreTone(value);

  if (tone === "success") {
    return {
      label: "Strong performance",
      barClass: getStatusToneClasses(tone).fill,
    };
  }
  if (tone === "warning") {
    return {
      label: "Needs improvement",
      barClass: getStatusToneClasses(tone).fill,
    };
  }
  return { label: "At risk", barClass: getStatusToneClasses(tone).fill };
}

export function AssessmentsOverview({
  subjectId,
  assessments,
  plan,
}: Readonly<AssessmentsOverviewProps>) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AssessmentEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentEntity | null>(
    null,
  );

  const limits = getPlanLimits(plan);
  const isAtLimit =
    limits.maxAssessmentsPerSubject !== null &&
    assessments.length >= limits.maxAssessmentsPerSubject;
  const todayIso = getTodayIso();
  const average = getAssessmentAverage(assessments);
  const averageMeta = average === null ? null : getAverageMeta(average);
  const subjectAssessments = useMemo(
    () =>
      [...assessments].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      ),
    [assessments],
  );

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Assessments</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            General overview for this subject.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setCreateOpen(true)}
            disabled={isAtLimit}
            title={
              isAtLimit
                ? "Upgrade your plan to add more assessments"
                : undefined
            }
          >
            <Plus className="size-4" />
            Add Assessment
          </Button>
        </div>
      </div>

      {isAtLimit && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            You&apos;ve reached the limit of {limits.maxAssessmentsPerSubject}{" "}
            assessments per subject on your plan. Upgrade to add more.
          </p>
        </div>
      )}

      {average !== null && (
        <div
          className={`relative mt-3 overflow-hidden rounded-2xl border p-4 sm:p-5 ${getAverageTone(average)}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/30 via-transparent to-transparent dark:from-white/10" />
          <div className="relative mb-2">
            <p className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4" />
              Subject Average
            </p>
          </div>
          <div className="relative flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <p className="text-4xl font-semibold tracking-tight text-white">
              {average.toFixed(1)}
            </p>
            {averageMeta && (
              <span className="text-sm font-medium">{averageMeta.label}</span>
            )}
          </div>
          {averageMeta && (
            <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-background/50">
              <div
                className={`h-full rounded-full ${averageMeta.barClass}`}
                style={{ width: `${Math.min(Math.max(average, 0), 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div
        className={`${average === null ? "" : "mt-3 "}rounded-xl border border-border/60 bg-card p-3 sm:p-4`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Subject Assessments
          </h3>
          <p className="text-sm text-muted-foreground">
            {limits.maxAssessmentsPerSubject === null
              ? `${subjectAssessments.length} items`
              : `${subjectAssessments.length}/${limits.maxAssessmentsPerSubject} items`}
          </p>
        </div>
        {subjectAssessments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4">
            <h4 className="text-sm font-semibold">No assessments yet</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by adding your first assessment.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {subjectAssessments.map((item) => {
              const overdue = isAssessmentOverdue(item, todayIso);

              return (
                <AssessmentItemCard
                  key={item.id}
                  item={item}
                  overdue={overdue}
                  className="group border-border/60 bg-card p-3 transition-colors hover:border-border hover:bg-muted/20 sm:p-4"
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                />
              );
            })}
          </div>
        )}
      </div>

      <CreateAssessmentDialog
        subjectId={subjectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editTarget && (
        <EditAssessmentDialog
          assessment={editTarget}
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
        />
      )}

      {deleteTarget && (
        <DeleteAssessmentDialog
          assessmentId={deleteTarget.id}
          assessmentTitle={deleteTarget.title}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </div>
  );
}
