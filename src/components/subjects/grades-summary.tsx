"use client";

import type { Locale } from "date-fns";
import {
  format,
  formatDistanceToNowStrict,
  parseISO,
  startOfToday,
} from "date-fns";
import { CheckCircle2, Clock3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { getDateFnsLocale } from "@/lib/dates/date-locale";
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

function getCountdownLabel(
  dueDate: string,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale: Locale,
): string {
  const due = parseISO(dueDate);
  const today = startOfToday();
  const distance = formatDistanceToNowStrict(due, { addSuffix: false, locale });
  const countMatch = distance.match(/^(\d+)/u);
  const count = countMatch ? Number(countMatch[1]) : 0;

  if (due < today) {
    return t("due_overdue", { distance });
  }

  if (format(due, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
    return t("due_today");
  }

  return t("due_in", { distance, count });
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
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations("GradesSummary");
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
        ? getCountdownLabel(item.dueDate, t, dateLocale)
        : null;

    return (
      <AssessmentItemCard
        key={item.id}
        item={item}
        overdue={overdue}
        dueDetail={dueDetail}
        showSubject={showSubjectFilter}
        showScore={false}
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
      {showHeader && (
        <div className="mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {heading ?? t("heading")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description ??
                (assessments.length === 0
                  ? t("header_empty")
                  : t("header_count", { count: assessments.length }))}
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
            label={t("subject")}
            value={subjectFilter}
            onValueChange={setSubjectFilter}
          >
            <SelectItem value="all">{t("subject_all")}</SelectItem>
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
          label={t("status")}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectItem value="all">{t("status_all")}</SelectItem>
          <SelectItem value="pending">{t("status_pending")}</SelectItem>
          <SelectItem value="completed">{t("status_completed")}</SelectItem>
          <SelectItem value="overdue">{t("status_overdue")}</SelectItem>
        </FilterSelectField>
        <FilterSelectField
          label={t("due_date")}
          value={dueDateFilter}
          onValueChange={(value) => setDueDateFilter(value as DueDateFilter)}
        >
          <SelectItem value="all">{t("due_any")}</SelectItem>
          <SelectItem value="past">{t("due_past")}</SelectItem>
          <SelectItem value="today">{t("due_today_option")}</SelectItem>
          <SelectItem value="next7Days">{t("due_next_7")}</SelectItem>
          <SelectItem value="next30Days">{t("due_next_30")}</SelectItem>
          <SelectItem value="none">{t("due_none")}</SelectItem>
        </FilterSelectField>
        <FilterSelectField
          label={t("type")}
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as TypeFilter)}
        >
          <SelectItem value="all">{t("type_all")}</SelectItem>
          <SelectItem value="exam">{t("type_exam")}</SelectItem>
          <SelectItem value="assignment">{t("type_assignment")}</SelectItem>
          <SelectItem value="project">{t("type_project")}</SelectItem>
          <SelectItem value="presentation">{t("type_presentation")}</SelectItem>
          <SelectItem value="homework">{t("type_homework")}</SelectItem>
          <SelectItem value="other">{t("type_other")}</SelectItem>
        </FilterSelectField>
        <FilterSelectField
          label={t("sort")}
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortBy)}
        >
          <SelectItem value="smart">{t("sort_smart")}</SelectItem>
          <SelectItem value="dueDateAsc">{t("sort_due_asc")}</SelectItem>
          <SelectItem value="dueDateDesc">{t("sort_due_desc")}</SelectItem>
          <SelectItem value="updatedAtDesc">{t("sort_updated")}</SelectItem>
          <SelectItem value="scoreDesc">{t("sort_score")}</SelectItem>
        </FilterSelectField>
      </div>

      {showAverage && average !== null && (
        <div
          className={`mb-6 rounded-xl border p-4 ${getAverageTone(average)}`}
        >
          <div className="mb-2">
            <p className="text-sm font-medium">{t("average")}</p>
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
              {t("pending")} ({pending.length})
            </h3>
          </div>
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {t("pending_empty")}
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
              {t("completed")} ({completed.length})
            </h3>
          </div>
          {completed.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {t("completed_empty")}
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
