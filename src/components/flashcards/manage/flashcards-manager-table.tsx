"use client";

import { Flame } from "lucide-react";
import { useMemo } from "react";
import { FlashcardsTableRowActions } from "@/components/flashcards/manage/flashcards-table-row-actions";
import type { FlashcardTarget } from "@/components/flashcards/manage/use-flashcards-manager-controller";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import type { ManagerColumnDef } from "@/components/shared/manager-table-features";
import { TableHeaderLabel } from "@/components/shared/table-header-label";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination/page-size";
import type { FlashcardManageItem } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface FlashcardsManagerTableProps {
  flashcards: FlashcardManageItem[];
  total: number;
  selectedFlashcardIds: string[];
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  /** Shows each row's lapse count, which orders the struggling filter. */
  showLapseCount: boolean;
  onCopyRequested: (flashcardId: string) => void;
  onMoveRequested: (flashcard: FlashcardTarget) => void;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onDeleteRequested: (flashcard: FlashcardTarget) => void;
  onResetRequested: (flashcard: FlashcardTarget) => void;
  onStudyLaterToggleRequested: (flashcard: FlashcardManageItem) => void;
  onSelectedFlashcardIdsChange: (ids: string[]) => void;
  onRowClick?: (flashcard: FlashcardManageItem) => void;
}

interface FlashcardRowActionHandlers {
  onCopyRequested: (flashcardId: string) => void;
  onMoveRequested: (flashcard: FlashcardTarget) => void;
  onDeleteRequested: (flashcard: FlashcardTarget) => void;
  onResetRequested: (flashcard: FlashcardTarget) => void;
  onStudyLaterToggleRequested: (flashcard: FlashcardManageItem) => void;
}

function getColumnClassName(columnId: string) {
  switch (columnId) {
    case "select":
      return "w-9 min-w-9";
    // max-w-0 lets the percentage widths win over content width, so long
    // text truncates instead of widening the table.
    case "front":
      return "w-[65%] max-w-0 lg:w-full";
    case "subjectPath":
      return "w-[35%] max-w-0 lg:w-36 lg:max-w-36";
    case "lapseCount":
      return "w-12 min-w-12";
    case "actions":
      return "w-14 min-w-14";
    default:
      return "";
  }
}

function LapseCountMarker({ lapseCount }: Readonly<{ lapseCount: number }>) {
  const label =
    lapseCount === 1 ? "Forgotten 1 time" : `Forgotten ${lapseCount} times`;

  return (
    <span
      className="flex shrink-0 items-center justify-end gap-0.5 py-1 text-xs text-muted-foreground"
      role="img"
      aria-label={label}
      title={label}
    >
      <Flame className="size-3.5" />
      {lapseCount}
    </span>
  );
}

const lapseCountColumn: ManagerColumnDef<FlashcardManageItem> = {
  id: "lapseCount",
  size: 48,
  header: () => <div className="w-12 min-w-12" />,
  cell: ({ row }) => <LapseCountMarker lapseCount={row.original.lapseCount} />,
};

function getColumns(
  {
    onCopyRequested,
    onMoveRequested,
    onDeleteRequested,
    onResetRequested,
    onStudyLaterToggleRequested,
  }: FlashcardRowActionHandlers,
  hasSelection: boolean,
  showLapseCount: boolean,
): ManagerColumnDef<FlashcardManageItem>[] {
  return [
    {
      accessorKey: "front",
      size: 220,
      header: () => <TableHeaderLabel>Front</TableHeaderLabel>,
      cell: ({ row }) => (
        <div
          className="min-w-0 truncate py-1 text-sm font-semibold leading-6 text-foreground/95"
          title={row.original.frontTitle ?? undefined}
        >
          {row.original.frontExcerpt}
        </div>
      ),
    },
    {
      accessorKey: "subjectPath",
      size: 140,
      header: () => <TableHeaderLabel>Subject</TableHeaderLabel>,
      cell: ({ row }) => (
        <div
          className="truncate py-1 text-sm leading-6 text-muted-foreground"
          title={row.original.subjectPath ?? undefined}
        >
          {row.original.subjectPath}
        </div>
      ),
    },
    ...(showLapseCount ? [lapseCountColumn] : []),
    {
      id: "actions",
      size: 56,
      header: () => <div className="flex w-14 min-w-14 justify-start" />,
      cell: ({ row }) => (
        <div className="flex w-14 min-w-14 items-center justify-start pl-1">
          <FlashcardsTableRowActions
            onCopyRequested={() => onCopyRequested(row.original.id)}
            onMoveRequested={() =>
              onMoveRequested({
                id: row.original.id,
                front: row.original.front,
              })
            }
            onResetRequested={() =>
              onResetRequested({
                id: row.original.id,
                front: row.original.front,
              })
            }
            onDeleteRequested={() =>
              onDeleteRequested({
                id: row.original.id,
                front: row.original.front,
              })
            }
            onStudyLaterToggleRequested={() =>
              onStudyLaterToggleRequested(row.original)
            }
            studyLaterMarked={row.original.studyLaterAt !== null}
            hasSelection={hasSelection}
          />
        </div>
      ),
    },
  ];
}

export function FlashcardsManagerTable({
  flashcards,
  total,
  selectedFlashcardIds,
  pageIndex,
  pageSize,
  isLoading,
  showLapseCount,
  onCopyRequested,
  onMoveRequested,
  onPageIndexChange,
  onPageSizeChange,
  onDeleteRequested,
  onResetRequested,
  onStudyLaterToggleRequested,
  onSelectedFlashcardIdsChange,
  onRowClick,
}: Readonly<FlashcardsManagerTableProps>) {
  const hasSelection = selectedFlashcardIds.length > 0;
  const columns = useMemo(
    () =>
      getColumns(
        {
          onCopyRequested,
          onMoveRequested,
          onDeleteRequested,
          onResetRequested,
          onStudyLaterToggleRequested,
        },
        hasSelection,
        showLapseCount,
      ),
    [
      hasSelection,
      showLapseCount,
      onCopyRequested,
      onDeleteRequested,
      onMoveRequested,
      onResetRequested,
      onStudyLaterToggleRequested,
    ],
  );

  return (
    <ManagerDataTable
      data={flashcards}
      columns={columns}
      pageIndex={pageIndex}
      pageCount={Math.max(1, Math.ceil(total / pageSize))}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      pageSizeLabel="Rows"
      isLoading={isLoading}
      loadingDelayMs={0}
      loadingMinimumVisibleMs={250}
      loadingSkeleton={
        <div className="h-full" data-testid="flashcards-manage-table-loading">
          <FlashcardsManagerTableSkeleton />
        </div>
      }
      onPageIndexChange={onPageIndexChange}
      onPageSizeChange={onPageSizeChange}
      selectedRowIds={selectedFlashcardIds}
      onSelectedRowIdsChange={onSelectedFlashcardIdsChange}
      selectionAriaLabel="Select flashcard"
      pageLabel={(current, total) => `Page ${current} of ${total}`}
      prevLabel="Previous"
      nextLabel="Next"
      emptyLabel="No flashcards match your filters."
      getRowId={(row) => row.id}
      onRowClick={onRowClick}
      tableClassName="w-full"
      getHeaderCellClassName={getColumnClassName}
      getBodyCellClassName={(columnId) =>
        cn("px-3 py-3 align-middle", getColumnClassName(columnId))
      }
      scrollAreaClassName="min-w-0 overflow-x-auto overflow-y-auto"
      wrapperClassName="min-w-0"
    />
  );
}

interface FlashcardsManagerTableSkeletonProps {
  className?: string;
}

export function FlashcardsManagerTableSkeleton({
  className,
}: Readonly<FlashcardsManagerTableSkeletonProps>) {
  return (
    <TableSkeleton
      className={cn("flex h-full flex-col", className)}
      headerClassName="py-3"
      columnTemplate="2.25rem minmax(0,1.85fr) minmax(0,1fr) 3.5rem"
      headers={[
        {
          content: (
            <div className="h-4 w-4 rounded-sm self-center justify-self-center bg-muted" />
          ),
        },
        { className: "h-4 w-16" },
        { className: "h-4 w-20" },
        { content: <div /> },
      ]}
      rows={[
        [
          {
            className: "h-4 w-4 rounded-sm self-center justify-self-center",
          },
          {
            className: "h-6 w-full",
          },
          { className: "h-6 w-full" },
          {
            className: "h-8 w-8 self-center justify-self-start ml-1",
          },
        ],
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
  );
}
