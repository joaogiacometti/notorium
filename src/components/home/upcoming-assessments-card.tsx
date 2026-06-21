import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { DashboardCardHeader } from "@/components/home/dashboard-card-header";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { Card, CardContent } from "@/components/ui/card";
import { assessmentTypeLabels } from "@/features/assessments/assessments";
import { formatDateShort, getTodayIso } from "@/lib/dates/format";
import { getAssessmentDetailHref } from "@/lib/navigation/detail-page-back-link";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import type { StatusTone } from "@/lib/ui/status-tones";

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
  const todayIso = getTodayIso();

  return (
    <Card className="gap-3 py-4">
      <DashboardCardHeader icon={CalendarDays} title="Upcoming assessments" />
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming assessments.
          </p>
        ) : (
          <ul className="grid gap-1">
            {assessments.map((assessment) => (
              <li key={assessment.id}>
                <AssessmentRow assessment={assessment} todayIso={todayIso} />
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

interface AssessmentRowProps {
  assessment: AssessmentEntity;
  todayIso: string;
}

function AssessmentRow({ assessment, todayIso }: Readonly<AssessmentRowProps>) {
  const due = resolveDueBadge(assessment.dueDate, todayIso);

  return (
    <Link
      href={getAssessmentDetailHref(assessment.id)}
      className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
    >
      <CalendarDays className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
        {assessment.title}
      </span>
      <span className="shrink-0 text-xs">
        {assessmentTypeLabels[assessment.type]}
      </span>
      <StatusToneBadge tone={due.tone} className="shrink-0 whitespace-nowrap">
        {due.label}
      </StatusToneBadge>
    </Link>
  );
}

interface DueBadge {
  tone: StatusTone;
  label: string;
}

/**
 * Maps an assessment due date to a tone-coded badge: overdue dates read danger,
 * anything within a week reads warning, and the rest stay neutral. Undated
 * assessments fall back to a neutral "No date" chip.
 */
function resolveDueBadge(dueDate: string | null, todayIso: string): DueBadge {
  if (!dueDate) {
    return { tone: "neutral", label: "No date" };
  }

  if (dueDate < todayIso) {
    return { tone: "danger", label: "Overdue" };
  }

  const days = daysBetweenIso(todayIso, dueDate);
  const tone: StatusTone = days <= 7 ? "warning" : "neutral";
  const label = days === 0 ? "Today" : formatDateShort(dueDate);

  return { tone, label };
}

function daysBetweenIso(fromIso: string, toIso: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const from = new Date(`${fromIso}T00:00:00.000Z`).getTime();
  const to = new Date(`${toIso}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / msPerDay);
}
