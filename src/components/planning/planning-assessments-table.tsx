"use client";

import { format, parseISO } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Ellipsis,
  GraduationCap,
  NotebookPen,
  Presentation,
  Rocket,
  ScrollText,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AssessmentItemCard } from "@/components/assessments/assessment-item-card";
import { AssessmentsTableRowActions } from "@/components/assessments/assessments-table-row-actions";
import { SubjectText } from "@/components/shared/subject-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type DueDateFilter,
  getDueDateBounds,
  type SortBy,
  type StatusFilter,
  type TypeFilter,
} from "@/features/assessments/assessment-filters";
import { isAssessmentOverdue } from "@/features/assessments/assessments";
import { derivePlanningAssessmentsTableState } from "@/features/planning/assessments-table-state";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type {
  AssessmentEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const allValue = "__all__";

type AssessmentType = AssessmentEntity["type"];

const TYPE_ICONS: Record<AssessmentType, LucideIcon> = {
  exam: GraduationCap,
  assignment: ClipboardList,
  project: Rocket,
  presentation: Presentation,
  homework: NotebookPen,
  other: Ellipsis,
};

type AssessmentStatus = "overdue" | "completed" | "pending";

function resolveStatus(
  overdue: boolean,
  status: AssessmentEntity["status"],
): AssessmentStatus {
  if (overdue) return "overdue";
  if (status === "completed") return "completed";
  return "pending";
}

const STATUS_TONE = {
  overdue: getStatusToneClasses("danger"),
  completed: getStatusToneClasses("success"),
  pending: getStatusToneClasses("warning"),
} as const;

interface PlanningAssessmentsTableProps {
  assessments: AssessmentEntity[];
  subjects: SubjectEntity[];
  subjectNamesById: Record<string, string>;
}

export function PlanningAssessmentsTable({
  assessments,
  subjects,
  subjectNamesById,
}: Readonly<PlanningAssessmentsTableProps>) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const t = useTranslations("PlanningAssessmentsTable");

  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState(allValue);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("smart");
  const [page, setPage] = useState(1);

  const dueDateBounds = getDueDateBounds();
  const dueDateFilter: DueDateFilter = "all";

  const { clampedPage, filteredAssessments, paginatedAssessments, totalPages } =
    derivePlanningAssessmentsTableState({
      assessments,
      dueDateBounds,
      dueDateFilter,
      page,
      pageSize: PAGE_SIZE,
      searchQuery,
      sortBy,
      statusFilter,
      subjectFilter: subjectFilter === allValue ? "all" : subjectFilter,
      typeFilter,
    });

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <Card className="gap-0 overflow-hidden border-border/60 bg-card/95 py-0 shadow-none lg:flex-1 lg:min-h-0">
        <CardHeader className="gap-0 border-b border-border/60 bg-muted/20 px-4 pb-3 pt-4 sm:px-6">
          <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 p-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  resetPage();
                }}
                placeholder={t("search_placeholder")}
                className="w-full border-border/60 bg-transparent shadow-none sm:col-span-2 lg:col-span-1"
              />
              <Select
                value={subjectFilter}
                onValueChange={(value) => {
                  setSubjectFilter(value);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full border-border/60 bg-transparent shadow-none">
                  <SelectValue placeholder={t("subject_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allValue}>{t("subject_all")}</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <SubjectText
                        value={subject.name}
                        mode="truncate"
                        className="block max-w-full"
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as StatusFilter);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full border-border/60 bg-transparent shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("status_all")}</SelectItem>
                  <SelectItem value="pending">{t("status_pending")}</SelectItem>
                  <SelectItem value="completed">
                    {t("status_completed")}
                  </SelectItem>
                  <SelectItem value="overdue">{t("status_overdue")}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as TypeFilter);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full border-border/60 bg-transparent shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("type_all")}</SelectItem>
                  <SelectItem value="exam">{t("type_exam")}</SelectItem>
                  <SelectItem value="assignment">
                    {t("type_assignment")}
                  </SelectItem>
                  <SelectItem value="project">{t("type_project")}</SelectItem>
                  <SelectItem value="presentation">
                    {t("type_presentation")}
                  </SelectItem>
                  <SelectItem value="homework">{t("type_homework")}</SelectItem>
                  <SelectItem value="other">{t("type_other")}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as SortBy);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full border-border/60 bg-transparent shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">{t("sort_smart")}</SelectItem>
                  <SelectItem value="dueDateAsc">
                    {t("sort_due_asc")}
                  </SelectItem>
                  <SelectItem value="dueDateDesc">
                    {t("sort_due_desc")}
                  </SelectItem>
                  <SelectItem value="updatedAtDesc">
                    {t("sort_updated")}
                  </SelectItem>
                  <SelectItem value="scoreDesc">{t("sort_score")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 py-0 lg:flex-1 lg:min-h-0">
          {assessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center lg:h-full">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ScrollText className="size-6" />
              </div>
              <h2 className="text-lg font-semibold">{t("empty_title")}</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {t("empty_description")}
              </p>
            </div>
          ) : (
            <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              {filteredAssessments.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
                  {t("no_results")}
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 lg:hidden">
                    {paginatedAssessments.map((item) => {
                      const overdue = isAssessmentOverdue(
                        item,
                        dueDateBounds.todayIso,
                      );

                      return (
                        <AssessmentItemCard
                          key={item.id}
                          item={item}
                          overdue={overdue}
                          showSubject
                          showScore
                          subjectName={
                            subjectNamesById[item.subjectId] ??
                            t("unknown_subject")
                          }
                          className="border border-border/60 bg-card p-4 shadow-sm"
                          actions={
                            <AssessmentsTableRowActions assessment={item} />
                          }
                          onEdit={() => undefined}
                          onDelete={() => undefined}
                        />
                      );
                    })}
                  </div>

                  <div className="hidden lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted/30 backdrop-blur-sm">
                        <TableRow className="border-border/50 bg-transparent hover:bg-transparent">
                          <TableHead className="h-11 w-[25%] px-4 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase sm:px-6">
                            {t("table_title")}
                          </TableHead>
                          <TableHead className="h-11 px-2 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
                            {t("table_type")}
                          </TableHead>
                          <TableHead className="h-11 px-2 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
                            {t("table_status")}
                          </TableHead>
                          <TableHead className="h-11 px-2 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
                            {t("table_due_date")}
                          </TableHead>
                          <TableHead className="h-11 px-2 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
                            {t("table_score")}
                          </TableHead>
                          <TableHead className="h-11 px-2 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
                            {t("table_subject")}
                          </TableHead>
                          <TableHead className="h-11 w-22 px-4 text-right text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase sm:px-6">
                            {t("table_actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAssessments.map((item) => {
                          const overdue = isAssessmentOverdue(
                            item,
                            dueDateBounds.todayIso,
                          );
                          const status = resolveStatus(overdue, item.status);
                          const statusTone = STATUS_TONE[status];
                          const TypeIcon = TYPE_ICONS[item.type];

                          return (
                            <TableRow
                              key={item.id}
                              className="group border-border/40 hover:bg-muted/20"
                            >
                              <TableCell className="max-w-0 px-4 py-2 sm:px-6">
                                <p className="truncate text-sm font-medium text-foreground/95">
                                  {item.title}
                                </p>
                                {item.description && (
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="px-2 py-2">
                                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <TypeIcon className="size-3.5" />
                                  <span>{t(`type_${item.type}`)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-2 py-2">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                                    statusTone.border,
                                    statusTone.bg,
                                    statusTone.text,
                                  )}
                                >
                                  {t(`status_${status}`)}
                                </span>
                              </TableCell>
                              <TableCell className="px-2 py-2 text-sm text-muted-foreground">
                                {item.dueDate
                                  ? format(
                                      parseISO(item.dueDate),
                                      "MMM d, yyyy",
                                      {
                                        locale: dateLocale,
                                      },
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-sm text-muted-foreground">
                                {item.score === null
                                  ? "—"
                                  : Number(item.score).toFixed(1)}
                              </TableCell>
                              <TableCell className="max-w-0 px-2 py-3">
                                <div className="inline-flex max-w-full items-center rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  <SubjectText
                                    value={
                                      subjectNamesById[item.subjectId] ??
                                      t("unknown_subject")
                                    }
                                    mode="truncate"
                                    className="block max-w-40"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right sm:px-6">
                                <div className="flex justify-end">
                                  <AssessmentsTableRowActions
                                    assessment={item}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              <div className="flex items-center justify-end gap-4 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={clampedPage <= 1}
                >
                  {t("prev")}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {t("page", { current: clampedPage, total: totalPages })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={clampedPage >= totalPages}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
