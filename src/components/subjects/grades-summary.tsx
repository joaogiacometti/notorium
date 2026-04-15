"use client";

import { parseISO, startOfToday } from "date-fns";
import { CheckCircle2, Clock3 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { AssessmentItemCard } from "@/components/assessments/assessment-item-card";
import { DeleteAssessmentDialog } from "@/components/assessments/delete-assessment-dialog";
import { EditAssessmentDialog } from "@/components/assessments/edit-assessment-dialog";
import { SubjectText } from "@/components/shared/subject-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DueDateFilter,
  filterAndSortAssessments,
  getDueDateBounds,
  getSubjectFilterOptions,
  type SortBy,
  type StatusFilter,
  type TypeFilter,
} from "@/features/assessments/assessment-filters";
import {
  getAssessmentAverage,
  isAssessmentOverdue,
} from "@/features/assessments/assessments";
import { formatIsoDate, formatRelativeTimeStrict } from "@/lib/dates/format";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";

interface GradesSummaryProps {
  assessments: AssessmentEntity[];
  heading?: string;
  description?: string;
  showAverage?: boolean;
  showSubjectFilter?: boolean;
  showHeader?: boolean;
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

function getAverageTone(value: number): string {
  const tone = getStatusToneClasses(getScoreTone(value));
  return `${tone.text} ${tone.bg} ${tone.border}`;
}

function getCountdownLabel(dueDate: string): string {
  const due = parseISO(dueDate);
  const today = startOfToday();
  const distance = formatRelativeTimeStrict(due.toISOString());

  if (due < today) {
    return `${distance} overdue`;
  }

  if (formatIsoDate(due) === formatIsoDate(today)) {
    return "Due today";
  }

  return `Due in ${distance}`;
}

export function GradesSummary({
  assessments,
  heading,
  description,
  showAverage = true,
  showSubjectFilter = false,
  showHeader = true,
  subjectNamesById,
}: Readonly<GradesSummaryProps>) {
  const dangerTone = getStatusToneClasses("danger");
  const [editTarget, setEditTarget] = useState<AssessmentEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentEntity | null>(
    null,
  );
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("smart");

  const dueDateBounds = getDueDateBounds();

  const subjectFilterOptions = getSubjectFilterOptions(
    assessments,
    subjectNamesById,
  );

  const filteredAssessments = filterAndSortAssessments({
    assessments,
    searchQuery: "",
    subjectFilter,
    statusFilter,
    typeFilter,
    dueDateBounds,
    dueDateFilter,
    sortBy,
  });

  const pending = filteredAssessments.filter(
    (item) => item.status === "pending",
  );
  const completed = filteredAssessments.filter(
    (item) => item.status === "completed",
  );
  const average = getAssessmentAverage(filteredAssessments);
  const renderAssessmentCard = (item: AssessmentEntity) => {
    const overdue = isAssessmentOverdue(item, dueDateBounds.todayIso);
    const dueDetail =
      item.dueDate !== null && item.status === "pending"
        ? getCountdownLabel(item.dueDate)
        : null;

    let cardClassName: string;
    if (item.status === "completed") {
      cardClassName = "border-border bg-muted/20";
    } else if (overdue) {
      cardClassName = `${dangerTone.border} bg-card`;
    } else {
      cardClassName = "border-border bg-card";
    }

    return (
      <AssessmentItemCard
        key={item.id}
        item={item}
        overdue={overdue}
        dueDetail={dueDetail}
        showSubject={showSubjectFilter}
        showScore={false}
        subjectName={subjectNamesById?.[item.subjectId]}
        className={cardClassName}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
      />
    );
  };

  return (
    <div>
      {showHeader && (
        <div className="mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {heading ?? "Assessments"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description ??
                (assessments.length === 0
                  ? "No assessments found."
                  : `${assessments.length} total assessments`)}
            </p>
          </div>
        </div>
      )}

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
                <SubjectText
                  value={subjectNamesById?.[subjectId] ?? subjectId}
                  mode="truncate"
                  className="block max-w-full"
                />
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
