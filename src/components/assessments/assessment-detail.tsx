"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AssessmentAttachmentsPanel } from "@/components/assessments/assessment-attachments-panel";
import { AssessmentTypeBadge } from "@/components/assessments/assessment-type-presentation";
import { DeleteAssessmentDialog } from "@/components/assessments/delete-assessment-dialog";
import { LazyEditAssessmentDialog as EditAssessmentDialog } from "@/components/assessments/lazy-edit-assessment-dialog";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAssessmentOverdue } from "@/features/assessments/assessments";
import { getAssessmentTypeLabel } from "@/features/assessments/constants";
import {
  ASSESSMENT_STATUS_LABEL,
  ASSESSMENT_STATUS_TONE,
  resolveAssessmentStatus,
} from "@/features/assessments/status";
import {
  formatIsoDate,
  formatRelativeTime,
  toUtcDate,
} from "@/lib/dates/format";
import type {
  AssessmentAttachmentEntity,
  AssessmentDetailEntity,
  AssessmentEntity,
} from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface AssessmentDetailProps {
  backHref: string;
  backLabel: string;
  detail: AssessmentDetailEntity;
}

function formatDate(value: Date | string | null, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return format(toUtcDate(value), "PPP");
}

function formatNumber(value: string | null, suffix = "") {
  if (value === null) {
    return null;
  }

  const numericValue = Number(value);

  return `${Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1)}${suffix}`;
}

export function AssessmentDetail({
  backHref,
  backLabel,
  detail,
}: Readonly<AssessmentDetailProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentEntity>(
    detail.assessment,
  );
  const [attachments, setAttachments] = useState<AssessmentAttachmentEntity[]>(
    detail.attachments,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const overdue = isAssessmentOverdue(
    currentAssessment,
    formatIsoDate(new Date()),
  );
  const assessmentStatus = resolveAssessmentStatus(
    overdue,
    currentAssessment.status,
  );
  const statusTone = ASSESSMENT_STATUS_TONE[assessmentStatus];
  const statusLabel = ASSESSMENT_STATUS_LABEL[assessmentStatus];

  const typeLabel = getAssessmentTypeLabel(currentAssessment.type);

  const score = formatNumber(currentAssessment.score);
  const weight = formatNumber(currentAssessment.weight, "%");
  const scoreTone =
    score === null
      ? null
      : getStatusToneClasses(getScoreTone(Number(currentAssessment.score)));

  return (
    <DetailPageLayout
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground sm:flex-none"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </>
      }
      backHref={backHref}
      backIcon={ArrowLeft}
      backLabel={backLabel}
      meta={
        <>
          <span>Created {formatRelativeTime(currentAssessment.createdAt)}</span>
          <span>Updated {formatRelativeTime(currentAssessment.updatedAt)}</span>
        </>
      }
      title={currentAssessment.title}
      titleIcon={ClipboardList}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SubjectBadge
            href={`/subjects/${detail.subject.id}`}
            label={detail.subject.name}
            maxWidthClassName="max-w-56"
          />
          <Badge
            variant="outline"
            className={cn(
              "h-7 rounded-full px-2.5 text-xs",
              statusTone.border,
              statusTone.bg,
              statusTone.text,
            )}
          >
            {statusLabel}
          </Badge>
          <AssessmentTypeBadge
            type={currentAssessment.type}
            className="h-7 rounded-full px-2.5"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground/80">
              Details
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Subject</dt>
                <dd className="text-right font-medium text-foreground">
                  {detail.subject.name}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-right font-medium text-foreground">
                  {typeLabel}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd className={cn("text-right font-medium", statusTone.text)}>
                  {statusLabel}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Due Date</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatDate(currentAssessment.dueDate, "No due date")}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground/80">
              Grading
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Score</dt>
                <dd
                  className={cn(
                    "text-right font-medium",
                    scoreTone?.text ?? "text-foreground",
                  )}
                >
                  {score ?? "No score"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Weight</dt>
                <dd className="text-right font-medium text-foreground">
                  {weight ?? "No weight"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Created on</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatDate(currentAssessment.createdAt, "No date")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Updated on</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatDate(currentAssessment.updatedAt, "No date")}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/80">
            <CalendarDays className="size-4 text-muted-foreground" />
            Description
          </h2>
          {currentAssessment.description ? (
            <p className="wrap-break-word hyphens-auto text-sm leading-6 text-foreground/90">
              {currentAssessment.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description provided.
            </p>
          )}
        </div>

        <AssessmentAttachmentsPanel
          assessmentId={currentAssessment.id}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
      </div>

      <EditAssessmentDialog
        assessment={currentAssessment}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(assessment) => {
          setCurrentAssessment(assessment);
        }}
      />
      <DeleteAssessmentDialog
        assessmentId={currentAssessment.id}
        assessmentTitle={currentAssessment.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          setDeleteOpen(false);
          startNavTransition(() => router.push(backHref));
        }}
      />
    </DetailPageLayout>
  );
}
