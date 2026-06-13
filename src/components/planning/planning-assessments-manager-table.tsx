"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AssessmentTypeBadge } from "@/components/assessments/assessment-type-presentation";
import { AssessmentsTableRowActions } from "@/components/assessments/assessments-table-row-actions";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { StatusToneBadge } from "@/components/shared/status-tone-badge";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import { TableRowActionSkeleton } from "@/components/shared/table-row-action-skeleton";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { isAssessmentOverdue } from "@/features/assessments/assessments";
import {
  ASSESSMENT_STATUS_LABEL,
  ASSESSMENT_STATUS_TONE_NAME,
  resolveAssessmentStatus,
} from "@/features/assessments/constants";
import { formatDateShort, formatIsoDate } from "@/lib/dates/format";
import { getAssessmentDetailHref } from "@/lib/navigation/detail-page-back-link";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination/page-size";
import type { AssessmentEntity } from "@/lib/server/api-contracts";
import { getScoreTone, getStatusToneClasses } from "@/lib/ui/status-tones";
import { cn } from "@/lib/utils";

interface PlanningAssessmentsManagerTableProps {
  assessments: AssessmentEntity[];
  finalGrade: number | null;
  total: number;
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  selectedAssessmentIds: string[];
  selectedSubjectId?: string;
  subjectNamesById: Record<string, string>;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectedAssessmentIdsChange: (ids: string[]) => void;
  onUpdated: (assessment: AssessmentEntity) => void;
  onDeleted: (id: string) => void;
}

function formatDueDate(dueDate: string | null) {
  if (dueDate === null) {
    return "—";
  }

  return formatDateShort(dueDate);
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

function getPreviewText(value: string, maxLength = 15) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function getColumnClassName(columnId: string) {
  switch (columnId) {
    case "title":
      return "min-w-[7rem]";
    case "type":
      return "hidden min-w-[5.5rem] sm:table-cell";
    case "status":
      return "hidden min-w-[5rem] sm:table-cell";
    case "dueDate":
      return "min-w-[4.5rem]";
    case "gradeWeight":
      return "hidden min-w-[5rem] sm:table-cell";
    case "subject":
      return "hidden min-w-[6rem] sm:table-cell";
    case "actions":
      return "w-14 min-w-14";
    default:
      return "";
  }
}

function getColumns(
  onUpdated: (assessment: AssessmentEntity) => void,
  onDeleted: (id: string) => void,
  subjectNamesById: Record<string, string>,
  todayIso: string,
  isLoading: boolean,
  hasSelection: boolean,
  selectedSubjectId?: string,
): ColumnDef<AssessmentEntity>[] {
  const columns: ColumnDef<AssessmentEntity>[] = [
    {
      accessorKey: "title",
      header: () => <TableHeaderLabel>Title</TableHeaderLabel>,
      cell: ({ row }) => (
        <Link
          href={getAssessmentDetailHref(row.original.id, {
            from: "planning-assessments",
            subjectId: selectedSubjectId,
          })}
          aria-label={`Open details for ${row.original.title}`}
          className="flex min-w-0 max-w-full items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="min-w-0 max-w-full flex-1 overflow-hidden">
            <div
              className="max-w-full truncate text-sm font-semibold leading-5.5 text-foreground/95"
              title={row.original.title}
            >
              {getPreviewText(row.original.title)}
            </div>
            {row.original.description ? (
              <div
                className="max-w-full truncate text-xs leading-5 text-muted-foreground"
                title={row.original.description}
              >
                {getPreviewText(row.original.description)}
              </div>
            ) : null}
          </div>
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: () => <TableHeaderLabel>Type</TableHeaderLabel>,
      cell: ({ row }) => (
        <AssessmentTypeBadge type={row.original.type} className="px-2.5 py-1" />
      ),
    },
    {
      accessorKey: "status",
      header: () => <TableHeaderLabel>Status</TableHeaderLabel>,
      cell: ({ row }) => {
        const isOverdue = isAssessmentOverdue(row.original, todayIso);
        const status = resolveAssessmentStatus(isOverdue, row.original.status);

        return (
          <StatusToneBadge tone={ASSESSMENT_STATUS_TONE_NAME[status]}>
            {ASSESSMENT_STATUS_LABEL[status]}
          </StatusToneBadge>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: () => <TableHeaderLabel>Due Date</TableHeaderLabel>,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center py-1 text-xs text-muted-foreground">
          <span className="truncate leading-5">
            {formatDueDate(row.original.dueDate)}
          </span>
        </div>
      ),
    },
    {
      id: "gradeWeight",
      header: () => (
        <TableHeaderLabel align="center">Grade/Weight</TableHeaderLabel>
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
        <div
          className="flex w-14 min-w-14 items-center justify-start pl-1"
          data-no-row-click
        >
          {isLoading ? (
            <TableRowActionSkeleton />
          ) : (
            <AssessmentsTableRowActions
              assessment={row.original}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
              hasSelection={hasSelection}
            />
          )}
        </div>
      ),
      enableHiding: false,
    },
  ];

  columns.splice(-1, 0, {
    id: "subject",
    header: () => <TableHeaderLabel>Subject</TableHeaderLabel>,
    cell: ({ row }) => {
      const subjectName = subjectNamesById[row.original.subjectId];

      if (!subjectName) {
        return (
          <SubjectBadge label="Unknown Subject" maxWidthClassName="max-w-30" />
        );
      }

      return (
        <SubjectBadge
          href={`/subjects/${row.original.subjectId}`}
          label={subjectName}
          maxWidthClassName="max-w-30"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        />
      );
    },
  });

  return columns;
}

export function PlanningAssessmentsManagerTable({
  assessments,
  finalGrade,
  total,
  isLoading,
  pageIndex,
  pageSize,
  selectedAssessmentIds,
  selectedSubjectId,
  subjectNamesById,
  onPageIndexChange,
  onPageSizeChange,
  onSelectedAssessmentIdsChange,
  onUpdated,
  onDeleted,
}: Readonly<PlanningAssessmentsManagerTableProps>) {
  const [todayIso] = useState(() => formatIsoDate(new Date()));
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const finalGradeTone =
    finalGrade === null ? null : getStatusToneClasses(getScoreTone(finalGrade));
  const hasSelection = selectedAssessmentIds.length > 0;
  const columns = useMemo(
    () =>
      getColumns(
        onUpdated,
        onDeleted,
        subjectNamesById,
        todayIso,
        isLoading,
        hasSelection,
        selectedSubjectId,
      ),
    [
      hasSelection,
      isLoading,
      onDeleted,
      onUpdated,
      selectedSubjectId,
      subjectNamesById,
      todayIso,
    ],
  );

  return (
    <ManagerDataTable
      data={assessments}
      columns={columns}
      pageIndex={pageIndex}
      pageCount={Math.max(1, Math.ceil(total / pageSize))}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      pageSizeLabel="Rows"
      isLoading={isLoading}
      loadingDelayMs={0}
      loadingMinimumVisibleMs={250}
      loadingSkeleton={<PlanningAssessmentsManagerTableSkeleton />}
      onPageIndexChange={onPageIndexChange}
      onPageSizeChange={onPageSizeChange}
      selectedRowIds={selectedAssessmentIds}
      onSelectedRowIdsChange={onSelectedAssessmentIdsChange}
      selectionAriaLabel="Select assessment"
      selectionColumnClassName="w-10 min-w-10 sm:w-auto sm:min-w-0"
      exposeRowNavigationRole={false}
      pageLabel={(current, total) => `Page ${current} of ${total}`}
      prevLabel="Previous"
      nextLabel="Next"
      emptyLabel="No assessments match your filters."
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        startNavTransition(() =>
          router.push(
            getAssessmentDetailHref(row.id, {
              from: "planning-assessments",
              subjectId: selectedSubjectId,
            }),
          ),
        )
      }
      tableClassName="w-full sm:min-w-160"
      getHeaderCellClassName={getColumnClassName}
      getBodyCellClassName={(columnId) =>
        cn("align-middle px-3 py-3", getColumnClassName(columnId))
      }
      footerClassName={cn(
        "sm:items-center",
        finalGrade === null ? "sm:justify-end" : "sm:justify-between",
      )}
      controlsClassName="sm:items-center"
      footerLeading={
        finalGrade === null ? null : (
          <div className="min-w-0 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Final grade:</span>{" "}
            <span className={finalGradeTone?.text}>
              {finalGrade === null ? "—" : finalGrade.toFixed(1)}
            </span>
          </div>
        )
      }
    />
  );
}

export function PlanningAssessmentsManagerTableSkeleton() {
  const mobileFooterSkeleton = (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-8 w-full rounded-full" />
        <Skeleton className="h-8 w-full rounded-full" />
      </div>
    </div>
  );
  const loadingActionSkeleton = <TableRowActionSkeleton />;

  return (
    <>
      <TableSkeleton
        className="flex h-full flex-col sm:hidden"
        columnTemplate="2.5rem minmax(0,1fr) 4.5rem 3rem"
        headerClassName="py-3"
        headers={[
          {
            content: (
              <div className="h-4 w-4 rounded-sm self-center justify-self-center bg-muted" />
            ),
          },
          { className: "h-4 w-12" },
          { className: "h-4 w-14" },
          { content: <div /> },
        ]}
        rows={[
          {
            className: "h-4 w-4 rounded-sm self-center justify-self-center",
          },
          {
            className: "h-6 w-full",
          },
          { className: "h-5 w-12" },
          {
            content: loadingActionSkeleton,
          },
        ]}
        rowClassName="py-2.5"
        rowCount={4}
        footer={[{ content: mobileFooterSkeleton }]}
        footerClassName="mt-auto"
      />
      <TableSkeleton
        className="hidden h-full flex-col sm:flex"
        columnTemplate="2.25rem 0.96fr 0.7fr 0.62fr 0.68fr 0.72fr 3.5rem"
        headerClassName="py-3"
        headers={[
          {
            content: (
              <div className="h-4 w-4 rounded-sm self-center justify-self-center bg-muted" />
            ),
          },
          { className: "h-4 w-16" },
          { className: "h-4 w-14" },
          { className: "h-4 w-16" },
          { className: "h-4 w-20" },
          { className: "h-4 w-16" },
          { content: <div /> },
        ]}
        rows={[
          {
            className: "h-4 w-4 rounded-sm self-center justify-self-center",
          },
          {
            className: "h-6 w-full",
          },
          { className: "h-6 w-24 rounded-full" },
          { className: "h-6 w-24 rounded-full" },
          { className: "h-6 w-full" },
          { className: "h-6 w-24 rounded-full" },
          {
            content: loadingActionSkeleton,
          },
        ]}
        rowClassName="py-2.5"
        rowCount={3}
        footer={[
          { className: "h-7 w-28 rounded-full" },
          { className: "h-8 w-24 rounded-full" },
          { className: "h-8 w-24 rounded-full" },
        ]}
        footerClassName="mt-auto"
      />
    </>
  );
}
