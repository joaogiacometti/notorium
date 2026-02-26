"use client";

import { format, parseISO } from "date-fns";
import { CalendarDays, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CreateAssessmentDialog } from "@/components/create-assessment-dialog";
import { DeleteAssessmentDialog } from "@/components/delete-assessment-dialog";
import { EditAssessmentDialog } from "@/components/edit-assessment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssessmentEntity } from "@/lib/api/contracts";

interface AssessmentsOverviewProps {
  subjectId: string;
  assessments: AssessmentEntity[];
}

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
  if (value >= 70) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (value >= 50) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
}

function getAverageMeta(value: number): { label: string; barClass: string } {
  if (value >= 70) {
    return { label: "Strong performance", barClass: "bg-emerald-500" };
  }
  if (value >= 50) {
    return { label: "Needs improvement", barClass: "bg-amber-500" };
  }
  return { label: "At risk", barClass: "bg-red-500" };
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

      {average !== null ? (
        <div
          className={`relative mt-3 overflow-hidden rounded-2xl border p-4 sm:p-5 ${getAverageTone(average)}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent dark:from-white/10" />
          <div className="relative mb-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4" />
              Subject Average
            </p>
            <Badge variant="secondary">Completed with score only</Badge>
          </div>
          <div className="relative flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <p className="text-4xl font-semibold tracking-tight">
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
      ) : (
        <div className="mt-3 rounded-xl border border-border/60 bg-card px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subject Average</span>
            <span className="font-medium text-muted-foreground">
              No scored completions
            </span>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-border/60 bg-card p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Subject Assessments
          </h3>
          <Badge variant="outline">{subjectAssessments.length}</Badge>
        </div>
        {subjectAssessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add your first assessment for this subject.
          </p>
        ) : (
          <div className="space-y-2">
            {subjectAssessments.map((item) => {
              const overdue =
                item.status === "pending" &&
                item.dueDate !== null &&
                item.dueDate < todayIso;

              return (
                <div
                  key={item.id}
                  className="group rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 px-1">
                      <p className="break-words text-sm font-medium">
                        {item.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        <Badge
                          variant={overdue ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {overdue
                            ? "Overdue"
                            : item.status === "completed"
                              ? "Completed"
                              : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                      {item.dueDate && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5" />
                          {format(parseISO(item.dueDate), "MMM d, yyyy")}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
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
