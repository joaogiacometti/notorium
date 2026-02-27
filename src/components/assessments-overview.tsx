"use client";

import { format, parseISO } from "date-fns";
import { CalendarDays, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CreateAssessmentDialog } from "@/components/create-assessment-dialog";
import { DeleteAssessmentDialog } from "@/components/delete-assessment-dialog";
import { EditAssessmentDialog } from "@/components/edit-assessment-dialog";
import { Button } from "@/components/ui/button";
import type { AssessmentEntity } from "@/lib/api/contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/status-tones";

interface AssessmentsOverviewProps {
  subjectId: string;
  assessments: AssessmentEntity[];
}

const typeLabels: Record<AssessmentEntity["type"], string> = {
  exam: "Exam",
  assignment: "Assignment",
  project: "Project",
  presentation: "Presentation",
  homework: "Homework",
  other: "Other",
};

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getAverage(assessments: AssessmentEntity[]): number | null {
  const completedWithScore = assessments.filter(
    (item) => item.status === "completed" && item.score !== null,
  );

  if (completedWithScore.length === 0) {
    return null;
  }

  const hasWeights = completedWithScore.some(
    (item) => item.weight !== null && Number(item.weight) > 0,
  );

  if (hasWeights) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const item of completedWithScore) {
      const weight = item.weight === null ? 0 : Number(item.weight);
      if (weight <= 0) {
        continue;
      }
      weightedSum += Number(item.score) * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return null;
    }

    return weightedSum / totalWeight;
  }

  const sum = completedWithScore.reduce(
    (acc, item) => acc + Number(item.score),
    0,
  );
  return sum / completedWithScore.length;
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
}: Readonly<AssessmentsOverviewProps>) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AssessmentEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentEntity | null>(
    null,
  );
  const todayIso = getTodayIso();
  const average = getAverage(assessments);
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
          >
            <Plus className="size-4" />
            Add Assessment
          </Button>
        </div>
      </div>

      {average !== null && (
        <div
          className={`relative mt-3 overflow-hidden rounded-2xl border p-4 sm:p-5 ${getAverageTone(average)}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent dark:from-white/10" />
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
        className={`${average !== null ? "mt-3 " : ""}rounded-xl border border-border/60 bg-card p-3 sm:p-4`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Subject Assessments
          </h3>
          <p className="text-sm text-muted-foreground">
            {subjectAssessments.length} items
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
              const overdue =
                item.status === "pending" &&
                item.dueDate !== null &&
                item.dueDate < todayIso;
              const statusTone = overdue
                ? getStatusToneClasses("danger")
                : item.status === "completed"
                  ? getStatusToneClasses("success")
                  : getStatusToneClasses("warning");
              const statusLabel = overdue
                ? "Overdue"
                : item.status === "completed"
                  ? "Completed"
                  : "Pending";
              const scoreTone =
                item.score === null
                  ? null
                  : getStatusToneClasses(getScoreTone(Number(item.score)));

              return (
                <div
                  key={item.id}
                  className="group rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-border hover:bg-muted/20 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 break-words text-sm font-semibold">
                      {item.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-foreground sm:size-8"
                        onClick={() => setEditTarget(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive sm:size-8"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  {item.description && (
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div
                      className={`rounded-lg border px-2.5 py-2 ${statusTone.border} ${statusTone.bg}`}
                    >
                      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-semibold ${statusTone.text}`}
                      >
                        {statusLabel}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
                      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Type
                      </p>
                      <p className="mt-0.5 text-sm font-medium">
                        {typeLabels[item.type]}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg border px-2.5 py-2 ${
                        overdue
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-border/50 bg-muted/20"
                      }`}
                    >
                      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Due Date
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium">
                        <CalendarDays className="size-3.5 text-muted-foreground" />
                        {item.dueDate
                          ? format(parseISO(item.dueDate), "MMM d, yyyy")
                          : "No due date"}
                      </p>
                    </div>
                    {scoreTone && (
                      <div
                        className={`rounded-lg border px-2.5 py-2 ${scoreTone.border} ${scoreTone.bg}`}
                      >
                        <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                          Score
                        </p>
                        <p
                          className={`mt-0.5 text-sm font-semibold ${scoreTone.text}`}
                        >
                          {Number(item.score).toFixed(1)}
                        </p>
                      </div>
                    )}
                    {item.weight !== null && (
                      <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
                        <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                          Weight
                        </p>
                        <p className="mt-0.5 text-sm font-medium">
                          {Number(item.weight).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
