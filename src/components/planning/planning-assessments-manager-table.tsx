"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { CalendarDays, ClipboardList } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AssessmentTypeBadge } from "@/components/assessments/assessment-type-presentation";
import { AssessmentsTableRowActions } from "@/components/assessments/assessments-table-row-actions";
import { SubjectChip } from "@/components/shared/subject-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAssessmentOverdue } from "@/features/assessments/assessments";
import { getDateFnsLocale } from "@/lib/dates/date-locale";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface PlanningAssessmentsManagerTableProps {
  assessments: AssessmentEntity[];
  finalGrade: number | null;
  pageIndex: number;
  showSubjectDetails: boolean;
  subjectNamesById: Record<string, string>;
  onPageIndexChange: (pageIndex: number) => void;
  onUpdated: (assessment: AssessmentEntity) => void;
  onDeleted: (id: string) => void;
}

function getStatusMeta(
  assessment: AssessmentEntity,
  todayIso: string,
  tTable: ReturnType<typeof useTranslations>,
  tAssessment: ReturnType<typeof useTranslations>,
) {
  if (isAssessmentOverdue(assessment, todayIso)) {
    return {
      label: tTable("status_overdue"),
      tone: getStatusToneClasses("danger"),
    };
  }

  if (assessment.status === "completed") {
    return {
      label: tAssessment("status_completed"),
      tone: getStatusToneClasses("success"),
    };
  }

  return {
    label: tAssessment("status_pending"),
    tone: getStatusToneClasses("warning"),
  };
}

function formatDueDate(
  dueDate: string | null,
  dateLocale: ReturnType<typeof getDateFnsLocale>,
) {
  if (dueDate === null) {
    return "—";
  }

  return format(parseISO(dueDate), "PP", { locale: dateLocale });
}

function formatScore(score: string | null) {
  if (score === null) {
    return "—";
  }

  return Number(score).toFixed(1);
}

function formatWeight(weight: string | null) {
  if (weight === null) {
    return "—";
  }

  const numericWeight = Number(weight);

  return `${Number.isInteger(numericWeight) ? numericWeight : numericWeight.toFixed(1)}%`;
}

function formatGradeWeight(score: string | null, weight: string | null) {
  return `${formatScore(score)}/${formatWeight(weight)}`;
}

function formatTrimmedTitle(title: string) {
  return title.length > 10 ? `${title.slice(0, 10)}...` : title;
}

function getColumnClassName(columnId: string, showSubjectDetails: boolean) {
  switch (columnId) {
    case "title":
      return "w-full min-w-[10rem]";
    case "type":
      return "min-w-[7rem]";
    case "status":
      return "min-w-[7.5rem]";
    case "dueDate":
      return "min-w-[7rem]";
    case "gradeWeight":
      return "min-w-[6.5rem]";
    case "subject":
      return showSubjectDetails ? "" : "min-w-[10rem]";
    case "actions":
      return "w-14 min-w-14";
    default:
      return "";
  }
}

function getColumns(
  onUpdated: (assessment: AssessmentEntity) => void,
  onDeleted: (id: string) => void,
  showSubjectDetails: boolean,
  subjectNamesById: Record<string, string>,
  todayIso: string,
  dateLocale: ReturnType<typeof getDateFnsLocale>,
  tTable: ReturnType<typeof useTranslations>,
  tAssessment: ReturnType<typeof useTranslations>,
): ColumnDef<AssessmentEntity>[] {
  const columns: ColumnDef<AssessmentEntity>[] = [
    {
      accessorKey: "title",
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_title")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2.5 py-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-xs">
            <ClipboardList className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-semibold leading-5.5 text-foreground/95"
              title={row.original.title}
            >
              {formatTrimmedTitle(row.original.title)}
            </div>
            {row.original.description ? (
              <div
                className="truncate text-xs leading-5 text-muted-foreground"
                title={row.original.description}
              >
                {row.original.description}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_type")}
        </div>
      ),
      cell: ({ row }) => (
        <AssessmentTypeBadge type={row.original.type} className="px-2.5 py-1" />
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_status")}
        </div>
      ),
      cell: ({ row }) => {
        const status = getStatusMeta(
          row.original,
          todayIso,
          tTable,
          tAssessment,
        );

        return (
          <Badge
            variant="outline"
            className={`rounded-full px-2 py-0.5 text-xs ${status.tone.border} ${status.tone.bg} ${status.tone.text}`}
          >
            {status.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_due_date")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5 py-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate leading-5">
            {formatDueDate(row.original.dueDate, dateLocale)}
          </span>
        </div>
      ),
    },
    {
      id: "gradeWeight",
      header: () => (
        <div className="px-1 text-center text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_grade_weight")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="py-1 text-center text-sm font-medium whitespace-nowrap text-foreground">
          {formatGradeWeight(row.original.score, row.original.weight)}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="flex w-14 min-w-14 justify-start" />,
      cell: ({ row }) => (
        <div className="flex w-14 min-w-14 items-center justify-start pl-1">
          <AssessmentsTableRowActions
            assessment={row.original}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        </div>
      ),
      enableHiding: false,
    },
  ];

  if (!showSubjectDetails) {
    columns.splice(columns.length - 1, 0, {
      id: "subject",
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_subject")}
        </div>
      ),
      cell: ({ row }) => {
        const subjectName = subjectNamesById[row.original.subjectId];

        if (!subjectName) {
          return (
            <SubjectChip
              label={tTable("unknown_subject")}
              maxWidthClassName="max-w-[10rem]"
            />
          );
        }

        return (
          <SubjectChip
            href={`/subjects/${row.original.subjectId}`}
            label={subjectName}
            maxWidthClassName="max-w-[10rem]"
          />
        );
      },
    });

    return columns;
  }

  return columns;
}

export function PlanningAssessmentsManagerTable({
  assessments,
  finalGrade,
  pageIndex,
  showSubjectDetails,
  subjectNamesById,
  onPageIndexChange,
  onUpdated,
  onDeleted,
}: Readonly<PlanningAssessmentsManagerTableProps>) {
  const tTable = useTranslations("PlanningAssessmentsTable");
  const tAssessment = useTranslations("AssessmentItemCard");
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const finalGradeTone =
    finalGrade === null ? null : getStatusToneClasses(getScoreTone(finalGrade));
  const pagination: PaginationState = {
    pageIndex,
    pageSize: 25,
  };

  const table = useReactTable({
    data: assessments,
    columns: getColumns(
      onUpdated,
      onDeleted,
      showSubjectDetails,
      subjectNamesById,
      todayIso,
      dateLocale,
      tTable,
      tAssessment,
    ),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      onPageIndexChange(nextPagination.pageIndex);
    },
    getRowId: (row) => row.id,
    state: {
      pagination,
    },
  });

  const pageCount = Math.max(table.getPageCount(), 1);

  return (
    <div className="flex h-full flex-col lg:min-h-0 lg:flex-1">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table
          className={cn(
            "w-full",
            showSubjectDetails ? "min-w-160" : "min-w-210",
          )}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-border/60 bg-muted/30 hover:bg-muted/30"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "sticky top-0 z-10 h-12 border-b border-border/60 bg-muted/30 px-3",
                      getColumnClassName(header.column.id, showSubjectDetails),
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-border/50 transition-colors duration-150 hover:bg-muted/20"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "align-middle",
                        getColumnClassName(cell.column.id, showSubjectDetails),
                        showSubjectDetails ? "px-2 py-3" : "px-3 py-3",
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-36 px-6 text-center text-sm text-muted-foreground"
                >
                  {tTable("no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div
        className={cn(
          "flex flex-col gap-2 border-t border-border/60 bg-muted/15 px-4 py-2.5 sm:flex-row sm:items-center",
          showSubjectDetails ? "sm:justify-between" : "sm:justify-end",
        )}
      >
        {showSubjectDetails ? (
          <div className="min-w-0 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {tTable("footer_final_grade")}:
            </span>{" "}
            <span className={finalGradeTone?.text}>
              {finalGrade === null ? "—" : finalGrade.toFixed(1)}
            </span>
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Badge
            variant="outline"
            className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-muted-foreground"
          >
            {tTable("page", {
              current: pagination.pageIndex + 1,
              total: pageCount,
            })}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-full border-border/70 bg-background/80 px-4"
          >
            {tTable("prev")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-full border-border/70 bg-background/80 px-4"
          >
            {tTable("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
