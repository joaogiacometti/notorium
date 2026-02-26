"use client";

import {
  addDays,
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
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
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
type DueDateFilter =
  | "all"
  | "past"
  | "today"
  | "next7Days"
  | "next30Days"
  | "none";
type SortBy =
  | "smart"
  | "dueDateAsc"
  | "dueDateDesc"
  | "updatedAtDesc"
  | "scoreDesc";

interface GradesSummaryProps {
  assessments: AssessmentEntity[];
  heading?: string;
  description?: string;
  showAverage?: boolean;
  showSubjectFilter?: boolean;
  subjectNamesById?: Record<string, string>;
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

function sortAssessments(
  items: AssessmentEntity[],
  sortBy: SortBy,
): AssessmentEntity[] {
  const sorted = [...items];

  if (sortBy === "updatedAtDesc") {
    return sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  if (sortBy === "dueDateAsc") {
    return sorted.sort((a, b) => {
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
    });
  }

  if (sortBy === "dueDateDesc") {
    return sorted.sort((a, b) => {
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
        return b.dueDate.localeCompare(a.dueDate);
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  if (sortBy === "scoreDesc") {
    return sorted.sort((a, b) => {
      if (a.score === null && b.score === null) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      if (a.score === null) {
        return 1;
      }
      if (b.score === null) {
        return -1;
      }
      return Number(b.score) - Number(a.score);
    });
  }

  return sorted.sort((a, b) => {
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

function isInDueDateWindow(
  item: AssessmentEntity,
  dueDateFilter: DueDateFilter,
  todayIso: string,
  next7DaysIso: string,
  next30DaysIso: string,
): boolean {
  if (dueDateFilter === "all") {
    return true;
  }

  if (dueDateFilter === "none") {
    return item.dueDate === null;
  }

  if (item.dueDate === null) {
    return false;
  }

  if (dueDateFilter === "past") {
    return item.dueDate < todayIso;
  }

  if (dueDateFilter === "today") {
    return item.dueDate === todayIso;
  }

  if (dueDateFilter === "next7Days") {
    return item.dueDate >= todayIso && item.dueDate <= next7DaysIso;
  }

  return item.dueDate >= todayIso && item.dueDate <= next30DaysIso;
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
  assessments,
  heading = "Assessments",
  description,
  showAverage = true,
  showSubjectFilter = false,
  subjectNamesById,
}: Readonly<GradesSummaryProps>) {
  const [editTarget, setEditTarget] = useState<AssessmentEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentEntity | null>(
    null,
  );
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("smart");

  const todayIso = getTodayIso();
  const next7DaysIso = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const next30DaysIso = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const subjectFilterOptions = useMemo(
    () =>
      Array.from(new Set(assessments.map((item) => item.subjectId))).filter(
        (subjectId) =>
          subjectNamesById?.[subjectId] !== undefined || !subjectNamesById,
      ),
    [assessments, subjectNamesById],
  );

  const filteredAssessments = useMemo(() => {
    return sortAssessments(
      assessments.filter((item) => {
        const subjectMatches =
          subjectFilter === "all" ? true : item.subjectId === subjectFilter;
        const overdue = isOverdueAssessment(item, todayIso);

        const statusMatches =
          statusFilter === "all"
            ? true
            : statusFilter === "overdue"
              ? overdue
              : item.status === statusFilter;

        const typeMatches =
          typeFilter === "all" ? true : item.type === typeFilter;

        const dueDateMatches = isInDueDateWindow(
          item,
          dueDateFilter,
          todayIso,
          next7DaysIso,
          next30DaysIso,
        );

        return subjectMatches && statusMatches && typeMatches && dueDateMatches;
      }),
      sortBy,
    );
  }, [
    assessments,
    dueDateFilter,
    next30DaysIso,
    next7DaysIso,
    sortBy,
    subjectFilter,
    statusFilter,
    todayIso,
    typeFilter,
  ]);

  const pending = filteredAssessments.filter(
    (item) => item.status === "pending",
  );
  const completed = filteredAssessments.filter(
    (item) => item.status === "completed",
  );
  const average = getAverage(filteredAssessments);

  return (
    <div>
      <div className="mb-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {description ??
              (assessments.length === 0
                ? "No assessments found."
                : `${assessments.length} total assessments`)}
          </p>
        </div>
      </div>

      <div
        className={`mb-6 grid gap-3 sm:grid-cols-2 ${
          showSubjectFilter ? "lg:grid-cols-5" : "lg:grid-cols-4"
        }`}
      >
        {showSubjectFilter && (
          <div className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Subject</span>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full min-w-0 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjectFilterOptions.map((subjectId) => (
                  <SelectItem key={subjectId} value={subjectId}>
                    {subjectNamesById?.[subjectId] ?? subjectId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Filter</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-full min-w-0 bg-background">
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
          <span className="text-muted-foreground">Due Date</span>
          <Select
            value={dueDateFilter}
            onValueChange={(value) => setDueDateFilter(value as DueDateFilter)}
          >
            <SelectTrigger className="w-full min-w-0 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Due Date</SelectItem>
              <SelectItem value="past">Past Due Date</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="next7Days">Next 7 Days</SelectItem>
              <SelectItem value="next30Days">Next 30 Days</SelectItem>
              <SelectItem value="none">No Due Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Type</span>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          >
            <SelectTrigger className="w-full min-w-0 bg-background">
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
        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Sort</span>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortBy)}
          >
            <SelectTrigger className="w-full min-w-0 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smart">Smart</SelectItem>
              <SelectItem value="dueDateAsc">Due Date Asc</SelectItem>
              <SelectItem value="dueDateDesc">Due Date Desc</SelectItem>
              <SelectItem value="updatedAtDesc">Recently Updated</SelectItem>
              <SelectItem value="scoreDesc">Score Desc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showAverage && average !== null && (
        <div
          className={`mb-6 rounded-xl border p-4 ${getAverageTone(average)}`}
        >
          <div className="mb-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">Average</p>
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
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium">{item.title}</p>
                        {item.description && (
                          <p className="mt-1 break-words text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {showSubjectFilter && (
                            <Badge variant="outline">
                              {subjectNamesById?.[item.subjectId] ??
                                "Unknown Subject"}
                            </Badge>
                          )}
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
                      <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:self-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 sm:size-8"
                          onClick={() => setEditTarget(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 text-muted-foreground hover:text-destructive sm:size-8"
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
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium">{item.title}</p>
                      {item.description && (
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {showSubjectFilter && (
                          <Badge variant="outline">
                            {subjectNamesById?.[item.subjectId] ??
                              "Unknown Subject"}
                          </Badge>
                        )}
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
                    <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:self-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 sm:size-8"
                        onClick={() => setEditTarget(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive sm:size-8"
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
