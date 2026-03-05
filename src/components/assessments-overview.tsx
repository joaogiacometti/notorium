"use client";

import { Lock, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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

function getAverageMeta(
  value: number,
  t: (key: string) => string,
): { label: string; barClass: string } {
  const tone = getScoreTone(value);

  if (tone === "success") {
    return {
      label: t("average_strong"),
      barClass: getStatusToneClasses(tone).fill,
    };
  }
  if (tone === "warning") {
    return {
      label: t("average_warning"),
      barClass: getStatusToneClasses(tone).fill,
    };
  }
  return {
    label: t("average_risk"),
    barClass: getStatusToneClasses(tone).fill,
  };
}

export function AssessmentsOverview({
  subjectId,
  assessments,
  plan,
}: Readonly<AssessmentsOverviewProps>) {
  const t = useTranslations("AssessmentsOverview");
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
  const averageMeta = average === null ? null : getAverageMeta(average, t);
  const subjectAssessments = [...assessments].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setCreateOpen(true)}
            disabled={isAtLimit}
            title={isAtLimit ? t("limit_tooltip") : undefined}
          >
            <Plus className="size-4" />
            {t("add_assessment")}
          </Button>
        </div>
      </div>

      {isAtLimit && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            {t("limit_message", {
              max: limits.maxAssessmentsPerSubject ?? 0,
            })}
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
              {t("subject_average")}
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
            {t("subject_assessments")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {limits.maxAssessmentsPerSubject === null
              ? t("items_no_limit", { count: subjectAssessments.length })
              : t("items_with_limit", {
                  count: subjectAssessments.length,
                  max: limits.maxAssessmentsPerSubject,
                })}
          </p>
        </div>
        {subjectAssessments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4">
            <h4 className="text-sm font-semibold">{t("empty_title")}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty_description")}
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
