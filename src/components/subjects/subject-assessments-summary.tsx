"use client";

import { format, parseISO } from "date-fns";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assessmentTypeStyles } from "@/components/assessments/assessment-type-presentation";
import { DeleteAssessmentDialog } from "@/components/assessments/delete-assessment-dialog";
import { LazyCreateAssessmentDialog } from "@/components/assessments/lazy-create-assessment-dialog";
import { LazyEditAssessmentDialog } from "@/components/assessments/lazy-edit-assessment-dialog";
import { ROW_ACTION_TRIGGER_CLASS } from "@/components/shared/row-action-visibility";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getAssessmentAverage,
  isAssessmentOverdue,
} from "@/features/assessments/assessments";
import { ASSESSMENT_STATUS_TONE } from "@/features/assessments/constants";
import { getTodayIso } from "@/lib/dates/format";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";

const ASSESSMENT_PREVIEW_COUNT = 3;

interface SubjectAssessmentsSummaryProps {
  assessments: AssessmentEntity[];
  subjectId: string;
  showManageAction?: boolean;
}

export function SubjectAssessmentsSummary({
  assessments,
  subjectId,
  showManageAction = true,
}: Readonly<SubjectAssessmentsSummaryProps>) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AssessmentEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const todayIso = getTodayIso();
  const average = getAssessmentAverage(assessments);
  const assessmentCount = assessments.length;
  const hasAssessments = assessmentCount > 0;
  const previewAssessments = assessments.slice(0, ASSESSMENT_PREVIEW_COUNT);
  const hasMore = assessments.length > ASSESSMENT_PREVIEW_COUNT;
  const viewAllHref = `/planning?view=assessments&subject=${subjectId}&status=all`;
  const averageToneClasses =
    average === null ? null : getStatusToneClasses(getScoreTone(average));
  const noGradeLabel = hasAssessments ? "No grade yet" : "No assessments yet";
  const summaryLabel = average === null ? noGradeLabel : "Assessment summary";
  const assessmentLabel = assessmentCount === 1 ? "assessment" : "assessments";
  const summaryDescription =
    average === null
      ? "Add completed assessments with a score to track your final grade."
      : `Based on ${assessmentCount} ${assessmentLabel}`;
  const cardClassName =
    average === null
      ? "rounded-xl border border-dashed border-border/60 bg-muted/20 p-4"
      : `rounded-xl border ${averageToneClasses?.border} ${averageToneClasses?.bg} p-4`;

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Assessments</h2>
          {showManageAction ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link
                  href={`/planning?view=assessments&subject=${subjectId}&status=all`}
                >
                  Manage
                </Link>
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                <span>Add</span>
              </Button>
            </div>
          ) : null}
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Track your grades and upcoming evaluations.
        </p>
      </div>

      <div className={cardClassName}>
        <div className="space-y-1">
          <p
            className={`text-sm font-semibold ${
              average === null
                ? "text-foreground"
                : (averageToneClasses?.text ?? "text-foreground")
            }`}
          >
            {summaryLabel}
          </p>
          {average === null ? null : (
            <p className="text-sm text-muted-foreground">Final grade</p>
          )}
        </div>

        <div
          className={`mt-3 flex gap-4 ${
            average === null ? "justify-start" : "items-end justify-between"
          }`}
        >
          {average === null ? null : (
            <div className="min-w-0">
              <div className="flex items-end gap-2">
                <p
                  className={`text-2xl font-bold tracking-tight ${averageToneClasses?.text ?? ""}`}
                >
                  {average.toFixed(1)}
                </p>
                <span className="text-base font-normal text-muted-foreground">
                  /100
                </span>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{summaryDescription}</p>
        </div>
      </div>

      {hasAssessments && (
        <div className="mt-3 space-y-0">
          {previewAssessments.map((a) => {
            const typeStyle = assessmentTypeStyles[a.type];
            const TypeIcon = typeStyle.icon;
            return (
              <div
                key={a.id}
                className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/35"
              >
                <TypeIcon
                  className={`size-4 shrink-0 ${typeStyle.iconColor}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-5">
                    {a.title}
                  </p>
                  <AssessmentMeta assessment={a} todayIso={todayIso} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={`${ROW_ACTION_TRIGGER_CLASS} shrink-0 text-muted-foreground`}
                      aria-label={`Open actions for ${a.title}`}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setEditTarget(a)}
                      className="cursor-pointer"
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        setDeleteTarget({ id: a.id, title: a.title })
                      }
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
          {hasMore && (
            <Button
              variant="outline"
              className="mt-3 w-full border-dashed"
              asChild
            >
              <Link href={viewAllHref}>
                View all {assessments.length} assessments
              </Link>
            </Button>
          )}
        </div>
      )}

      <LazyCreateAssessmentDialog
        subjectId={subjectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />
      {editTarget && (
        <LazyEditAssessmentDialog
          assessment={editTarget}
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onUpdated={() => router.refresh()}
        />
      )}
      {deleteTarget && (
        <DeleteAssessmentDialog
          assessmentId={deleteTarget.id}
          assessmentTitle={deleteTarget.title}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleted={() => router.refresh()}
        />
      )}
    </div>
  );
}

function AssessmentMeta({
  assessment,
  todayIso,
}: Readonly<{
  assessment: AssessmentEntity;
  todayIso: string;
}>) {
  if (assessment.status === "completed" && assessment.score !== null) {
    const n = Number(assessment.score);
    const display = Number.isInteger(n) ? String(n) : n.toFixed(1);
    const scoreTone = getStatusToneClasses(getScoreTone(n));
    return (
      <p className={`truncate text-xs leading-4 ${scoreTone.text}`}>
        Grade: {display}/100
      </p>
    );
  }

  if (assessment.dueDate !== null) {
    const overdue = isAssessmentOverdue(assessment, todayIso);
    const dateStr = format(parseISO(assessment.dueDate), "MM/dd/yyyy");
    return (
      <p
        className={`truncate text-xs leading-4 ${
          overdue
            ? ASSESSMENT_STATUS_TONE.overdue.text
            : "text-muted-foreground"
        }`}
      >
        Due {dateStr}
      </p>
    );
  }

  return null;
}
