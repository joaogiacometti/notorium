"use client";

import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AssessmentAttachmentsSection } from "@/components/assessments/assessment-attachments-section";
import { DeleteAssessmentDialog } from "@/components/assessments/delete-assessment-dialog";
import { LazyEditAssessmentDialog as EditAssessmentDialog } from "@/components/assessments/lazy-edit-assessment-dialog";
import { AppPageContainer } from "@/components/shared/app-page-container";
import {
  type BreadcrumbItem,
  PageTopBar,
} from "@/components/shared/page-top-bar";
import { Button } from "@/components/ui/button";
import { isAssessmentOverdue } from "@/features/assessments/assessments";
import {
  ASSESSMENT_STATUS_LABEL,
  ASSESSMENT_STATUS_TONE,
  getAssessmentTypeLabel,
  resolveAssessmentStatus,
} from "@/features/assessments/constants";
import { LIMITS } from "@/lib/config/limits";
import { formatDateWithRelative, formatIsoDate } from "@/lib/dates/format";
import type {
  AssessmentDetailEntity,
  AssessmentEntity,
} from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface AssessmentDetailProps {
  attachmentsEnabled: boolean;
  breadcrumb: BreadcrumbItem[];
  /** Where to navigate after the assessment is deleted. */
  returnHref: string;
  detail: AssessmentDetailEntity;
}

function formatNumber(value: string | null, suffix = "") {
  if (value === null) {
    return null;
  }
  const numericValue = Number(value);
  return `${Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1)}${suffix}`;
}

function DetailRow({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

interface AssessmentGradingCardProps {
  scoreValue: number | null;
  maxScore: number;
  percentage: number;
  scoreTone: ReturnType<typeof getStatusToneClasses> | null;
  weight: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function AssessmentGradingCard({
  scoreValue,
  maxScore,
  percentage,
  scoreTone,
  weight,
  createdAt,
  updatedAt,
}: Readonly<AssessmentGradingCardProps>) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Grading
      </h3>
      {scoreValue === null ? (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">No score yet</p>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">
              {Math.round(scoreValue)}
            </span>
            <span className="text-sm text-muted-foreground">/ {maxScore}</span>
            <span className={cn("text-sm font-medium", scoreTone?.text)}>
              {percentage}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                scoreTone?.fill,
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
      <dl className="space-y-3">
        <DetailRow label="Weight">{weight ?? "No weight"}</DetailRow>
        <DetailRow label="Created">
          {formatDateWithRelative(createdAt, "No date")}
        </DetailRow>
        <DetailRow label="Updated">
          {formatDateWithRelative(updatedAt, "No date")}
        </DetailRow>
      </dl>
    </div>
  );
}

interface AssessmentDescriptionSectionProps {
  description: string | null;
  onAddDescription: () => void;
}

function AssessmentDescriptionSection({
  description,
  onAddDescription,
}: Readonly<AssessmentDescriptionSectionProps>) {
  if (!description) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Description
        </h3>
        <button
          type="button"
          onClick={onAddDescription}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 py-4 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground/70"
        >
          <Plus className="size-4" />
          Add a description
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Description
      </h3>
      <p className="wrap-break-word hyphens-auto text-sm leading-6 text-foreground/90">
        {description}
      </p>
    </div>
  );
}

export function AssessmentDetail({
  attachmentsEnabled,
  breadcrumb,
  returnHref,
  detail,
}: Readonly<AssessmentDetailProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentEntity>(
    detail.assessment,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const editFocusFieldRef = useRef<"title" | "description">("title");

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

  const scoreValue =
    currentAssessment.score === null ? null : Number(currentAssessment.score);
  const maxScore = LIMITS.assessmentScoreMax;
  const percentage =
    scoreValue === null
      ? 0
      : Math.min(Math.round((scoreValue / maxScore) * 100), 100);
  const scoreToneName = scoreValue === null ? null : getScoreTone(scoreValue);
  const scoreTone = scoreToneName ? getStatusToneClasses(scoreToneName) : null;

  const weight = formatNumber(currentAssessment.weight, "%");

  return (
    <>
      <PageTopBar breadcrumb={breadcrumb} />
      <AppPageContainer maxWidth="4xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold text-foreground">
                {currentAssessment.title}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  statusTone.border,
                  statusTone.bg,
                  statusTone.text,
                )}
              >
                <Clock className="size-3" />
                {statusLabel}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  editFocusFieldRef.current = "title";
                  setEditOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-(--intent-danger-text) hover:bg-(--intent-danger-fill) hover:text-(--intent-danger-text)"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>

          {/* Two cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Details card */}
            <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Details
              </h3>
              <dl className="space-y-3">
                <DetailRow label="Subject">{detail.subject.name}</DetailRow>
                <DetailRow label="Type">{typeLabel}</DetailRow>
                <DetailRow label="Status">
                  <span className={statusTone.text}>{statusLabel}</span>
                </DetailRow>
                <DetailRow label="Due date">
                  {formatDateWithRelative(
                    currentAssessment.dueDate,
                    "No due date",
                  )}
                </DetailRow>
              </dl>
            </div>

            <AssessmentGradingCard
              scoreValue={scoreValue}
              maxScore={maxScore}
              percentage={percentage}
              scoreTone={scoreTone}
              weight={weight}
              createdAt={currentAssessment.createdAt}
              updatedAt={currentAssessment.updatedAt}
            />
          </div>

          <AssessmentDescriptionSection
            description={currentAssessment.description}
            onAddDescription={() => {
              editFocusFieldRef.current = "description";
              setEditOpen(true);
            }}
          />

          {attachmentsEnabled && (
            <AssessmentAttachmentsSection
              assessmentId={currentAssessment.id}
              initialAttachments={detail.attachments}
            />
          )}
        </div>

        <EditAssessmentDialog
          assessment={currentAssessment}
          open={editOpen}
          onOpenChange={setEditOpen}
          focusField={editFocusFieldRef.current}
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
            startNavTransition(() => router.push(returnHref));
          }}
        />
      </AppPageContainer>
    </>
  );
}
