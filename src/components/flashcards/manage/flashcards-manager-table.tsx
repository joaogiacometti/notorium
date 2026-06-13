"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { FlashcardsTableRowActions } from "@/components/flashcards/manage/flashcards-table-row-actions";
import type { FlashcardTarget } from "@/components/flashcards/manage/use-flashcards-manager-controller";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
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
  onEditRequested: (flashcardId: string) => void;
  onMoveRequested: (flashcard: FlashcardTarget) => void;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onDeleteRequested: (flashcard: FlashcardTarget) => void;
  onResetRequested: (flashcard: FlashcardTarget) => void;
  onSelectedFlashcardIdsChange: (ids: string[]) => void;
  onRowClick?: (flashcard: FlashcardManageItem) => void;
}

const flashcardFrontPreviewMaxLength = 28;

function getColumnClassName(columnId: string) {
  switch (columnId) {
    case "select":
      return "w-9 min-w-9";
    case "front":
      return "min-w-[7.5rem] max-w-[8.5rem] sm:min-w-[10rem] sm:max-w-[12rem] lg:min-w-[8rem] lg:max-w-[11rem]";
    case "deckPath":
      return "min-w-[5.5rem] sm:min-w-[7rem] lg:min-w-[4rem] lg:max-w-[9rem]";
    case "actions":
      return "w-14 min-w-14";
    default:
      return "";
  }
}

function getFlashcardFrontPreview(value: string) {
  if (value.length <= flashcardFrontPreviewMaxLength) {
    return value;
  }

  return `${value.slice(0, flashcardFrontPreviewMaxLength).trimEnd()}...`;
}

function FlashcardFrontCell({ item }: Readonly<{ item: FlashcardManageItem }>) {
  if (item.type === "occlusion" && item.occlusionImagePathname) {
    const count = item.maskCount ?? 0;
    return (
      <div className="flex min-w-0 items-center gap-2 py-1">
        {/* biome-ignore lint/performance/noImgElement: blob route is auth-gated and not a Next static asset. */}
        <img
          src={`/api/attachments/blob?pathname=${encodeURIComponent(item.occlusionImagePathname)}`}
          alt=""
          className="size-9 shrink-0 rounded border border-border object-cover"
        />
        <span className="truncate text-sm font-semibold leading-6 text-foreground/95">
          Image occlusion · {count} mask{count === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center py-1">
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className="truncate text-sm font-semibold leading-6 text-foreground/95"
          title={item.frontTitle ?? undefined}
        >
          {getFlashcardFrontPreview(item.frontExcerpt)}
        </div>
      </div>
    </div>
  );
}

function getColumns(
  onEditRequested: (flashcardId: string) => void,
  onMoveRequested: (flashcard: FlashcardTarget) => void,
  onDeleteRequested: (flashcard: FlashcardTarget) => void,
  onResetRequested: (flashcard: FlashcardTarget) => void,
): ColumnDef<FlashcardManageItem>[] {
  return [
    {
      accessorKey: "front",
      size: 220,
      header: () => <TableHeaderLabel>Front</TableHeaderLabel>,
      cell: ({ row }) => <FlashcardFrontCell item={row.original} />,
    },
    {
      accessorKey: "deckPath",
      size: 140,
      header: () => <TableHeaderLabel>Deck</TableHeaderLabel>,
      cell: ({ row }) => (
        <div
          className="min-w-0 overflow-hidden truncate py-1 text-sm leading-6 text-muted-foreground"
          title={row.original.deckPath ?? undefined}
        >
          {row.original.deckPath}
        </div>
      ),
    },
    {
      id: "actions",
      size: 56,
      header: () => <div className="flex w-14 min-w-14 justify-start" />,
      cell: ({ row }) => (
        <div className="flex w-14 min-w-14 items-center justify-start pl-1">
          <FlashcardsTableRowActions
            onEditRequested={() => onEditRequested(row.original.id)}
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
          />
        </div>
      ),
      enableHiding: false,
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
  onEditRequested,
  onMoveRequested,
  onPageIndexChange,
  onPageSizeChange,
  onDeleteRequested,
  onResetRequested,
  onSelectedFlashcardIdsChange,
  onRowClick,
}: Readonly<FlashcardsManagerTableProps>) {
  const columns = useMemo(
    () =>
      getColumns(
        onEditRequested,
        onMoveRequested,
        onDeleteRequested,
        onResetRequested,
      ),
    [onDeleteRequested, onEditRequested, onMoveRequested, onResetRequested],
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
      tableClassName="w-full min-w-[22rem] sm:min-w-[27rem] lg:min-w-[20rem]"
      columnResizeMode="onEnd"
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
      columnTemplate="2.25rem minmax(7.5rem,1.35fr) minmax(5.5rem,0.9fr) 3.5rem"
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
            className:
              "h-8 w-8 self-center justify-self-start rounded-full ml-1",
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
