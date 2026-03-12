"use client";

import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getAssessmentAverage } from "@/features/assessments/assessments";
import { Link } from "@/i18n/routing";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";

interface SubjectAssessmentsSummaryProps {
  assessments: AssessmentEntity[];
  subjectId: string;
}

export function SubjectAssessmentsSummary({
  assessments,
  subjectId,
}: Readonly<SubjectAssessmentsSummaryProps>) {
  const t = useTranslations("SubjectAssessmentsSummary");
  const average = getAssessmentAverage(assessments);
  const assessmentCount = assessments.length;
  const hasAssessments = assessmentCount > 0;
  const averageToneClasses =
    average === null ? null : getStatusToneClasses(getScoreTone(average));
  const cardClassName =
    average === null
      ? "rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 sm:p-6"
      : `rounded-xl border ${averageToneClasses?.border} ${averageToneClasses?.bg} p-5 sm:p-6`;

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            asChild
          >
            <Link href={`/planning?view=assessments&subject=${subjectId}`}>
              <ClipboardList className="size-3.5" />
              {t("manage_in_planning")}
            </Link>
          </Button>
        </div>
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
            {average !== null
              ? t("status_ready")
              : hasAssessments
                ? t("status_no_grade")
                : t("status_empty")}
          </p>
          {average !== null ? (
            <p className="text-sm text-muted-foreground">
              {t("subject_average")}
            </p>
          ) : null}
        </div>

        <div
          className={`mt-4 flex gap-4 ${
            average === null ? "justify-start" : "items-end justify-between"
          }`}
        >
          {average !== null ? (
            <div className="min-w-0">
              <div className="flex items-end gap-2">
                <p
                  className={`text-3xl font-bold tracking-tight ${averageToneClasses?.text ?? ""}`}
                >
                  {average.toFixed(1)}
                </p>
                <span className="pb-0.5 text-lg font-normal text-muted-foreground">
                  /100
                </span>
              </div>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {average !== null
              ? t("assessment_count", { count: assessmentCount })
              : t("empty_helper")}
          </p>
        </div>
      </div>
    </div>
  );
}
