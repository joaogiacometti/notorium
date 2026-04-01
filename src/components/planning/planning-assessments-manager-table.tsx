"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarDays, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AssessmentTypeBadge } from "@/components/assessments/assessment-type-presentation";
import { AssessmentsTableRowActions } from "@/components/assessments/assessments-table-row-actions";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { SubjectChip } from "@/components/shared/subject-chip";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { isAssessmentOverdue } from "@/features/assessments/assessments";
import { getAssessmentDetailHref } from "@/features/navigation/detail-page-back-link";
import { formatDateShort, formatIsoDate } from "@/lib/dates/format";
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
  selectedSubjectId?: string;
  subjectNamesById: Record<string, string>;
  onPageIndexChange: (pageIndex: number) => void;
  onUpdated: (assessment: AssessmentEntity) => void;
  onDeleted: (id: string) => void;
}

function getStatusMeta(assessment: AssessmentEntity, todayIso: string) {
  if (isAssessmentOverdue(assessment, todayIso)) {
    return {
      label: "Overdue",
      tone: getStatusToneClasses("danger"),
    };
  }

  if (assessment.status === "completed") {
    return {
      label: "Completed",
      tone: getStatusToneClasses("success"),
    };
  }

  return {
    label: "Pending",
    tone: getStatusToneClasses("warning"),
  };
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
      return "min-w-[5.5rem]";
    case "status":
      return "min-w-[5rem]";
    case "dueDate":
      return "min-w-[4.5rem]";
    case "gradeWeight":
      return "min-w-[5rem]";
    case "subject":
      return "min-w-[6rem]";
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
): ColumnDef<AssessmentEntity>[] {
  const columns: ColumnDef<AssessmentEntity>[] = [
    {
      accessorKey: "title",
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Title
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 max-w-full items-center gap-2.5 py-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-xs">
            <ClipboardList className="size-4" />
          </div>
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
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Type
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
          Status
        </div>
      ),
      cell: ({ row }) => {
        const status = getStatusMeta(row.original, todayIso);

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
          Due Date
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5 py-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate leading-5">
            {formatDueDate(row.original.dueDate)}
          </span>
        </div>
      ),
    },
    {
      id: "gradeWeight",
      header: () => (
        <div className="px-1 text-center text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Grade/Weight
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
        <div
          className="flex w-14 min-w-14 items-center justify-start pl-1"
          data-no-row-click
        >
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

  columns.splice(-1, 0, {
    id: "subject",
    header: () => (
      <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        Subject
      </div>
    ),
    cell: ({ row }) => {
      const subjectName = subjectNamesById[row.original.subjectId];

      if (!subjectName) {
        return (
          <SubjectChip
            label="Unknown Subject"
            maxWidthClassName="max-w-[7.5rem]"
          />
        );
      }

      return (
        <SubjectChip
          href={`/subjects/${row.original.subjectId}`}
          label={subjectName}
          maxWidthClassName="max-w-[7.5rem]"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
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
  selectedSubjectId,
  subjectNamesById,
  onPageIndexChange,
  onUpdated,
  onDeleted,
}: Readonly<PlanningAssessmentsManagerTableProps>) {
  const [todayIso] = useState(() => formatIsoDate(new Date()));
  const router = useRouter();
  const [, startNavTransition] = useTransition();
  const finalGradeTone =
    finalGrade === null ? null : getStatusToneClasses(getScoreTone(finalGrade));

  return (
    <ManagerDataTable
      data={assessments}
      columns={getColumns(onUpdated, onDeleted, subjectNamesById, todayIso)}
      pageIndex={pageIndex}
      pageCount={Math.max(1, Math.ceil(total / pageSize))}
      pageSize={pageSize}
      isLoading={isLoading}
      loadingSkeleton={<PlanningAssessmentsManagerTableSkeleton />}
      onPageIndexChange={onPageIndexChange}
      pageLabel={(current, total) => `Page ${current} of ${total}`}
      prevLabel="Previous"
      nextLabel="Next"
      emptyLabel="No assessments match your filters."
      getRowId={(row) => row.id}
      getRowAriaLabel={(row) => `Open details for ${row.title}`}
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
      tableClassName="w-full min-w-160"
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
  return (
    <TableSkeleton
      columnTemplate="0.96fr 0.7fr 0.62fr 0.68fr 0.72fr 3.5rem"
      headers={[
        { className: "h-4 w-16" },
        { className: "h-4 w-14" },
        { className: "h-4 w-16" },
        { className: "h-4 w-20" },
        { className: "h-4 w-16" },
        { content: <div /> },
      ]}
      rows={[
        { className: "h-14 w-full" },
        { className: "h-7 w-24 rounded-full" },
        { className: "h-7 w-24 rounded-full" },
        { className: "h-6 w-full" },
        { className: "h-7 w-24 rounded-full" },
        {
          className: "h-10 w-10 self-center justify-self-start rounded-full",
        },
      ]}
      rowCount={4}
      footer={[
        { className: "h-7 w-28 rounded-full" },
        { className: "h-8 w-24 rounded-full" },
        { className: "h-8 w-24 rounded-full" },
      ]}
    />
  );
}
