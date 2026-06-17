import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assessmentTypeLabels } from "@/features/assessments/assessments";
import { formatDateShort } from "@/lib/dates/format";
import { getAssessmentDetailHref } from "@/lib/navigation/detail-page-back-link";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

interface UpcomingAssessmentsCardProps {
  assessments: AssessmentEntity[];
}

/**
 * Dashboard card listing the soonest upcoming assessments, each linking to its
 * detail page, with a shortcut into Planning.
 */
export function UpcomingAssessmentsCard({
  assessments,
}: Readonly<UpcomingAssessmentsCardProps>) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <CalendarDays className="size-4 text-muted-foreground" />
        <CardTitle className="text-base">Upcoming assessments</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming assessments.
          </p>
        ) : (
          <ul className="space-y-2">
            {assessments.map((assessment) => (
              <li key={assessment.id}>
                <Link
                  href={getAssessmentDetailHref(assessment.id)}
                  className="flex items-baseline justify-between gap-3 rounded-md text-sm hover:text-foreground"
                >
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {assessment.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {assessmentTypeLabels[assessment.type]}
                    {assessment.dueDate
                      ? ` · ${formatDateShort(assessment.dueDate)}`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/planning"
          className="mt-auto inline-block pt-1 text-sm font-medium text-primary hover:underline"
        >
          View planning →
        </Link>
      </CardContent>
    </Card>
  );
}
