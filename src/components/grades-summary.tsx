"use client";

import {
  addDays,
  format,
  formatDistanceToNowStrict,
  parseISO,
  startOfToday,
} from "date-fns";
import { CheckCircle2, Clock3 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { AssessmentItemCard } from "@/components/assessment-item-card";
import { DeleteAssessmentDialog } from "@/components/delete-assessment-dialog";
import { EditAssessmentDialog } from "@/components/edit-assessment-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssessmentEntity } from "@/lib/api/contracts";
import {
  getAssessmentAverage,
  getTodayIso,
  isAssessmentOverdue,
} from "@/lib/assessments";
import { getScoreTone, getStatusToneClasses } from "@/lib/status-tones";

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

interface FilterSelectFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

function FilterSelectField({
  label,
  value,
  onValueChange,
  children,
}: Readonly<FilterSelectFieldProps>) {
  return (
    <div className="space-y-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full min-w-0 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
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

function getAverageTone(value: number): string {
  const tone = getStatusToneClasses(getScoreTone(value));
  return `${tone.text} ${tone.bg} ${tone.border}`;
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
        const overdue = isAssessmentOverdue(item, todayIso);

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
  const average = getAssessmentAverage(filteredAssessments);
  const renderAssessmentCard = (item: AssessmentEntity) => {
    const overdue = isAssessmentOverdue(item, todayIso);
    const dueDetail =
      item.dueDate !== null && item.status === "pending"
        ? getCountdownLabel(item.dueDate)
        : null;

    return (
      <AssessmentItemCard
        key={item.id}
        item={item}
        overdue={overdue}
        dueDetail={dueDetail}
        showSubject={showSubjectFilter}
        subjectName={subjectNamesById?.[item.subjectId]}
        className={
          item.status === "completed"
            ? "border-border bg-muted/20"
            : overdue
              ? "border-red-500/40 bg-card"
              : "border-border bg-card"
        }
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
      />
    );
  };

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
          <FilterSelectField
            label="Subject"
            value={subjectFilter}
            onValueChange={setSubjectFilter}
          >
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectFilterOptions.map((subjectId) => (
              <SelectItem key={subjectId} value={subjectId}>
                {subjectNamesById?.[subjectId] ?? subjectId}
              </SelectItem>
            ))}
          </FilterSelectField>
        )}
        <FilterSelectField
          label="Status"
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </FilterSelectField>
        <FilterSelectField
          label="Due Date"
          value={dueDateFilter}
          onValueChange={(value) => setDueDateFilter(value as DueDateFilter)}
        >
          <SelectItem value="all">Any Due Date</SelectItem>
          <SelectItem value="past">Past Due Date</SelectItem>
          <SelectItem value="today">Due Today</SelectItem>
          <SelectItem value="next7Days">Next 7 Days</SelectItem>
          <SelectItem value="next30Days">Next 30 Days</SelectItem>
          <SelectItem value="none">No Due Date</SelectItem>
        </FilterSelectField>
        <FilterSelectField
          label="Type"
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as TypeFilter)}
        >
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="exam">Exam</SelectItem>
          <SelectItem value="assignment">Assignment</SelectItem>
          <SelectItem value="project">Project</SelectItem>
          <SelectItem value="presentation">Presentation</SelectItem>
          <SelectItem value="homework">Homework</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </FilterSelectField>
        <FilterSelectField
          label="Sort"
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortBy)}
        >
          <SelectItem value="smart">Smart</SelectItem>
          <SelectItem value="dueDateAsc">Due Date Asc</SelectItem>
          <SelectItem value="dueDateDesc">Due Date Desc</SelectItem>
          <SelectItem value="updatedAtDesc">Recently Updated</SelectItem>
          <SelectItem value="scoreDesc">Score Desc</SelectItem>
        </FilterSelectField>
      </div>

      {showAverage && average !== null && (
        <div
          className={`mb-6 rounded-xl border p-4 ${getAverageTone(average)}`}
        >
          <div className="mb-2">
            <p className="text-sm font-medium">Average</p>
          </div>
          <p className="text-3xl font-semibold tracking-tight text-white">
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
              {pending.map((item) => renderAssessmentCard(item))}
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
              {completed.map((item) => renderAssessmentCard(item))}
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
