"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Pencil,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AssessmentTypeBadge } from "@/components/assessments/assessment-type-presentation";
import { DeleteAssessmentDialog } from "@/components/assessments/delete-assessment-dialog";
import { EditAssessmentDialog } from "@/components/assessments/edit-assessment-dialog";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { SubjectChip } from "@/components/shared/subject-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAssessmentOverdue } from "@/features/assessments/assessments";
import { useRouter } from "@/i18n/routing";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type {
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

function formatDate(
  value: Date | string | null,
  dateLocale: ReturnType<typeof getDateFnsLocale>,
  emptyLabel: string,
) {
  if (!value) {
    return emptyLabel;
  }

  return format(new Date(value), "PPP", { locale: dateLocale });
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
  const t = useTranslations("AssessmentDetail");
  const tAssessment = useTranslations("AssessmentItemCard");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const router = useRouter();
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentEntity>(
    detail.assessment,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const overdue = isAssessmentOverdue(
    currentAssessment,
    format(new Date(), "yyyy-MM-dd"),
  );
  const statusTone = overdue
    ? getStatusToneClasses("danger")
    : currentAssessment.status === "completed"
      ? getStatusToneClasses("success")
      : getStatusToneClasses("warning");
  const statusLabel = overdue
    ? tAssessment("status_overdue")
    : currentAssessment.status === "completed"
      ? tAssessment("status_completed")
      : tAssessment("status_pending");
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
            {t("edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground sm:flex-none"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            {t("delete")}
          </Button>
        </>
      }
      backHref={backHref}
      backIcon={ArrowLeft}
      backLabel={backLabel}
      meta={
        <>
          <span>
            {t("created_label")}{" "}
            {formatDistanceToNow(new Date(currentAssessment.createdAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
          <span>
            {t("updated_label")}{" "}
            {formatDistanceToNow(new Date(currentAssessment.updatedAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
        </>
      }
      title={currentAssessment.title}
      titleIcon={ClipboardList}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SubjectChip
            href={`/subjects/${detail.subject.id}`}
            label={detail.subject.name}
            maxWidthClassName="max-w-56"
          />
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              statusTone.border,
              statusTone.bg,
              statusTone.text,
            )}
          >
            {statusLabel}
          </Badge>
          <AssessmentTypeBadge
            type={currentAssessment.type}
            className="px-2.5 py-1"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground/80">
              {t("details_heading")}
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("subject_label")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {detail.subject.name}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("type_label")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {tAssessment(`type_${currentAssessment.type}`)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("status_label")}</dt>
                <dd className={cn("text-right font-medium", statusTone.text)}>
                  {statusLabel}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("due_date_label")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatDate(
                    currentAssessment.dueDate,
                    dateLocale,
                    t("no_due_date"),
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground/80">
              {t("grading_heading")}
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("score_label")}</dt>
                <dd
                  className={cn(
                    "text-right font-medium",
                    scoreTone?.text ?? "text-foreground",
                  )}
                >
                  {score ?? t("no_score")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("weight_label")}</dt>
                <dd className="text-right font-medium text-foreground">
                  {weight ?? t("no_weight")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">
                  {t("created_on_label")}
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {formatDate(
                    currentAssessment.createdAt,
                    dateLocale,
                    t("no_date"),
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">
                  {t("updated_on_label")}
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {formatDate(
                    currentAssessment.updatedAt,
                    dateLocale,
                    t("no_date"),
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/80">
            <CalendarDays className="size-4 text-muted-foreground" />
            {t("description_label")}
          </h2>
          {currentAssessment.description ? (
            <p className="wrap-break-word hyphens-auto text-sm leading-6 text-foreground/90">
              {currentAssessment.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("no_description")}
            </p>
          )}
        </div>
      </div>

      <EditAssessmentDialog
        assessment={currentAssessment}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={setCurrentAssessment}
      />
      <DeleteAssessmentDialog
        assessmentId={currentAssessment.id}
        assessmentTitle={currentAssessment.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          setDeleteOpen(false);
          router.push(backHref);
        }}
      />
    </DetailPageLayout>
  );
}
