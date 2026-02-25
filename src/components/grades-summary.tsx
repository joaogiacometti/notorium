"use client";

import {
  format,
  formatDistanceToNowStrict,
  parseISO,
  startOfToday,
} from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CreateAssessmentDialog } from "@/components/create-assessment-dialog";
import { DeleteAssessmentDialog } from "@/components/delete-assessment-dialog";
import { EditAssessmentDialog } from "@/components/edit-assessment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssessmentEntity } from "@/lib/api/contracts";

type StatusFilter = "all" | "pending" | "completed" | "overdue";
type TypeFilter =
  | "all"
  | "exam"
  | "assignment"
  | "project"
  | "presentation"
  | "homework"
  | "other";

interface GradesSummaryProps {
  subjectId: string;
  assessments: AssessmentEntity[];
}

const typeLabels: Record<Exclude<TypeFilter, "all">, string> = {
  exam: "Exam",
  assignment: "Assignment",
  project: "Project",
  presentation: "Presentation",
  homework: "Homework",
  other: "Other",
};

function getTodayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function isOverdueAssessment(
  item: AssessmentEntity,
  todayIso: string,
): boolean {
  return (
    item.status === "pending" &&
    item.dueDate !== null &&
    item.dueDate < todayIso
  );
}

function sortAssessments(items: AssessmentEntity[]): AssessmentEntity[] {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "pending" ? -1 : 1;
    }

    if (a.status === "pending" && b.status === "pending") {
      if (a.dueDate === null && b.dueDate === null) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      if (a.dueDate === null) {
        return 1;
      }
      if (b.dueDate === null) {
        return -1;
      }
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }

    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
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
    return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";
  }
  if (value >= 50) {
    return "text-amber-600 bg-amber-500/10 border-amber-500/30";
  }
  return "text-red-600 bg-red-500/10 border-red-500/30";
}

function getCountdownLabel(dueDate: string): string {
  const due = parseISO(dueDate);
  const today = startOfToday();
  const distance = formatDistanceToNowStrict(due, { addSuffix: true });

  if (due < today) {
    return `${distance} overdue`;
  }

  if (format(due, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
    return "Due today";
  }

  return `Due ${distance}`;
}

export function GradesSummary({
  subjectId,
  assessments,
}: Readonly<GradesSummaryProps>) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AssessmentEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentEntity | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const todayIso = getTodayIso();
  const average = getAverage(assessments);

  const filteredAssessments = useMemo(() => {
    return sortAssessments(
      assessments.filter((item) => {
        const overdue = isOverdueAssessment(item, todayIso);

        const statusMatches =
          statusFilter === "all"
            ? true
            : statusFilter === "overdue"
              ? overdue
              : item.status === statusFilter;

        const typeMatches =
          typeFilter === "all" ? true : item.type === typeFilter;

        return statusMatches && typeMatches;
      }),
    );
  }, [assessments, statusFilter, todayIso, typeFilter]);

  const pending = filteredAssessments.filter(
    (item) => item.status === "pending",
  );
  const completed = filteredAssessments.filter(
    (item) => item.status === "completed",
  );

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Assessments</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {assessments.length === 0
              ? "Create your first assessment to start planning deadlines and tracking performance."
              : `${assessments.length} total assessments`}
          </p>
        </div>
        <Button
          size="sm"
          className="w-full gap-1.5 sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Assessment</span>
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Filter</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Type</span>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="exam">Exam</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="presentation">Presentation</SelectItem>
              <SelectItem value="homework">Homework</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {average !== null && (
        <div
          className={`mb-6 rounded-xl border p-4 ${getAverageTone(average)}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Subject Average</p>
            <Badge variant="secondary">Completed with score only</Badge>
          </div>
          <p className="text-3xl font-semibold tracking-tight">
            {average.toFixed(1)}
          </p>
        </div>
      )}

      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pending ({pending.length})
            </h3>
          </div>
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No pending assessments.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((item) => {
                const overdue = isOverdueAssessment(item, todayIso);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border bg-card p-4 ${
                      overdue ? "border-red-500/40" : "border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {typeLabels[item.type]}
                          </Badge>
                          <Badge
                            variant={overdue ? "destructive" : "secondary"}
                          >
                            {overdue ? "Overdue" : "Pending"}
                          </Badge>
                          {item.dueDate && (
                            <Badge variant="outline" className="gap-1">
                              <CalendarDays className="size-3" />
                              {format(parseISO(item.dueDate), "MMM d, yyyy")}
                            </Badge>
                          )}
                          {item.dueDate && (
                            <Badge
                              variant={overdue ? "destructive" : "secondary"}
                              className="gap-1"
                            >
                              {overdue && <AlertTriangle className="size-3" />}
                              {getCountdownLabel(item.dueDate)}
                            </Badge>
                          )}
                          {item.score !== null && (
                            <Badge variant="outline">
                              Score: {Number(item.score).toFixed(1)}
                            </Badge>
                          )}
                          {item.weight !== null && (
                            <Badge variant="outline">
                              Weight: {Number(item.weight).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditTarget(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Completed ({completed.length})
            </h3>
          </div>
          {completed.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No completed assessments.
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{typeLabels[item.type]}</Badge>
                        <Badge variant="secondary">Completed</Badge>
                        {item.dueDate && (
                          <Badge variant="outline" className="gap-1">
                            <CalendarDays className="size-3" />
                            {format(parseISO(item.dueDate), "MMM d, yyyy")}
                          </Badge>
                        )}
                        {item.score !== null && (
                          <Badge variant="outline">
                            Score: {Number(item.score).toFixed(1)}
                          </Badge>
                        )}
                        {item.weight !== null && (
                          <Badge variant="outline">
                            Weight: {Number(item.weight).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditTarget(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
