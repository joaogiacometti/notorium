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
import { BookOpen, CalendarDays, ClipboardList } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AssessmentsTableRowActions } from "@/components/assessments/assessments-table-row-actions";
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
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface PlanningAssessmentsManagerTableProps {
  assessments: AssessmentEntity[];
  pageIndex: number;
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

function getColumns(
  onUpdated: (assessment: AssessmentEntity) => void,
  onDeleted: (id: string) => void,
  subjectNamesById: Record<string, string>,
  todayIso: string,
  dateLocale: ReturnType<typeof getDateFnsLocale>,
  tTable: ReturnType<typeof useTranslations>,
  tAssessment: ReturnType<typeof useTranslations>,
): ColumnDef<AssessmentEntity>[] {
  return [
    {
      accessorKey: "title",
      size: 172,
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
            <div className="truncate text-sm font-semibold leading-5.5 text-foreground/95">
              {row.original.title}
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
      size: 104,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_type")}
        </div>
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="rounded-full border-border/70 bg-muted/35 px-2.5 py-1 text-muted-foreground"
        >
          {tAssessment(`type_${row.original.type}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      size: 100,
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
      size: 112,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_due_date")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate leading-5">
            {formatDueDate(row.original.dueDate, dateLocale)}
          </span>
        </div>
      ),
    },
    {
      id: "subject",
      size: 112,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {tTable("table_subject")}
        </div>
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="max-w-[7.5rem] rounded-full border-border/70 bg-muted/35 px-2.5 py-1 text-muted-foreground"
        >
          <BookOpen className="size-3.5" />
          <span className="truncate">
            {subjectNamesById[row.original.subjectId] ??
              tTable("unknown_subject")}
          </span>
        </Badge>
      ),
    },
    {
      id: "actions",
      size: 56,
      header: () => <div className="flex w-14 min-w-14 justify-start" />,
      cell: ({ row }) => (
        <div className="flex w-14 min-w-14 items-center justify-start">
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
}

export function PlanningAssessmentsManagerTable({
  assessments,
  pageIndex,
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
  const pagination: PaginationState = {
    pageIndex,
    pageSize: 25,
  };

  const table = useReactTable({
    data: assessments,
    columns: getColumns(
      onUpdated,
      onDeleted,
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
    columnResizeMode: "onChange",
    state: {
      pagination,
    },
  });

  const pageCount = Math.max(table.getPageCount(), 1);

  return (
    <div className="flex h-full flex-col lg:min-h-0 lg:flex-1">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-border/60 bg-muted/30 hover:bg-muted/30"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 z-10 h-12 border-b border-border/60 bg-muted/30 px-3"
                    style={{
                      width: header.getSize(),
                    }}
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
                      className="px-3 py-3 align-middle"
                      style={{
                        width: cell.column.getSize(),
                      }}
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
      <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/15 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end">
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
  );
}
