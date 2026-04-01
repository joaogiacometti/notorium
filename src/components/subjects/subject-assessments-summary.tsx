"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAssessmentAverage } from "@/features/assessments/assessments";
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
          <h2 className="text-lg font-semibold tracking-tight">Assessments</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track how your completed assessments shape the final grade.
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
              Manage assessments
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
              ? "Assessment summary"
              : hasAssessments
                ? "No grade yet"
                : "No assessments yet"}
          </p>
          {average !== null ? (
            <p className="text-sm text-muted-foreground">Final grade</p>
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
              ? `Based on ${assessmentCount} ${assessmentCount === 1 ? "assessment" : "assessments"}`
              : "Add completed assessments with a score to track your final grade."}
          </p>
        </div>
      </div>
    </div>
  );
}
