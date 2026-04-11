"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard } from "lucide-react";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import {
  getRichTextExcerpt,
  richTextToPlainText,
} from "@/lib/editor/rich-text";
import type { FlashcardManageItem } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";
import { FlashcardsTableRowActions } from "./flashcards-table-row-actions";
import type { FlashcardTarget } from "./use-flashcards-manager-controller";

interface FlashcardsManagerTableProps {
  flashcards: FlashcardManageItem[];
  total: number;
  selectedFlashcardIds: string[];
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  onEditRequested: (flashcardId: string) => void;
  onPageIndexChange: (pageIndex: number) => void;
  onDeleteRequested: (flashcard: FlashcardTarget) => void;
  onResetRequested: (flashcard: FlashcardTarget) => void;
  onSelectedFlashcardIdsChange: (ids: string[]) => void;
  onRowClick?: (flashcard: FlashcardManageItem) => void;
}

const flashcardFrontPreviewLength = 30;

function getFlashcardFrontPreview(front: string) {
  return getRichTextExcerpt(front, flashcardFrontPreviewLength);
}

function getFlashcardFrontTitle(front: string) {
  return richTextToPlainText(front) || undefined;
}

function getColumnClassName(columnId: string) {
  switch (columnId) {
    case "select":
      return "w-9 min-w-9";
    case "front":
      return "min-w-[10rem]";
    case "back":
      return "min-w-[8rem]";
    case "subjectName":
      return "min-w-[8rem]";
    case "deckName":
      return "min-w-[8rem]";
    case "actions":
      return "w-14 min-w-14";
    default:
      return "";
  }
}

function getColumns(
  onEditRequested: (flashcardId: string) => void,
  onDeleteRequested: (flashcard: FlashcardTarget) => void,
  onResetRequested: (flashcard: FlashcardTarget) => void,
): ColumnDef<FlashcardManageItem>[] {
  return [
    {
      accessorKey: "front",
      size: 160,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Front
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3 py-1">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-xs">
            <CreditCard className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-semibold leading-6 text-foreground/95"
              title={getFlashcardFrontTitle(row.original.front)}
            >
              {getFlashcardFrontPreview(row.original.front)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "back",
      size: 140,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Back
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="min-w-0 truncate py-1 text-sm leading-6 text-muted-foreground"
          title={row.original.backExcerpt}
        >
          {row.original.backExcerpt}
        </div>
      ),
    },
    {
      accessorKey: "subjectName",
      size: 112,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Subject
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="min-w-0 truncate py-1 text-sm leading-6 text-muted-foreground"
          title={row.original.subjectName}
        >
          {row.original.subjectName}
        </div>
      ),
    },
    {
      accessorKey: "deckName",
      size: 112,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Deck
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="min-w-0 truncate py-1 text-sm leading-6 text-muted-foreground"
          title={row.original.deckName ?? undefined}
        >
          {row.original.deckName}
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
  onPageIndexChange,
  onDeleteRequested,
  onResetRequested,
  onSelectedFlashcardIdsChange,
  onRowClick,
}: Readonly<FlashcardsManagerTableProps>) {
  return (
    <ManagerDataTable
      data={flashcards}
      columns={getColumns(onEditRequested, onDeleteRequested, onResetRequested)}
      pageIndex={pageIndex}
      pageCount={Math.max(1, Math.ceil(total / pageSize))}
      pageSize={pageSize}
      isLoading={isLoading}
      loadingDelayMs={0}
      loadingMinimumVisibleMs={250}
      loadingSkeleton={
        <div className="h-full" data-testid="flashcards-manage-table-loading">
          <FlashcardsManagerTableSkeleton
            selectedRow={selectedFlashcardIds.length > 0}
          />
        </div>
      }
      onPageIndexChange={onPageIndexChange}
      selectedRowIds={selectedFlashcardIds}
      onSelectedRowIdsChange={onSelectedFlashcardIdsChange}
      selectionAriaLabel="Select flashcard"
      pageLabel={(current, total) => `Page ${current} of ${total}`}
      prevLabel="Previous"
      nextLabel="Next"
      emptyLabel="No flashcards match your filters."
      getRowId={(row) => row.id}
      onRowClick={onRowClick}
      tableClassName="w-full min-w-176"
      getHeaderCellClassName={getColumnClassName}
      getBodyCellClassName={(columnId) =>
        cn("px-3 py-3 align-middle", getColumnClassName(columnId))
      }
    />
  );
}

interface FlashcardsManagerTableSkeletonProps {
  className?: string;
  selectedRow?: boolean;
}

export function FlashcardsManagerTableSkeleton({
  className,
  selectedRow = false,
}: Readonly<FlashcardsManagerTableSkeletonProps>) {
  return (
    <TableSkeleton
      className={cn("flex h-full flex-col", className)}
      columnTemplate={
        selectedRow
          ? "2.25rem 1.35fr 1fr 0.7fr 0.7fr 3.5rem"
          : "1.35fr 1fr 0.7fr 0.7fr 3.5rem"
      }
      headers={
        selectedRow
          ? [
              { content: <div /> },
              { className: "h-4 w-16" },
              { className: "h-4 w-14" },
              { className: "h-4 w-20" },
              { className: "h-4 w-16" },
              { content: <div /> },
            ]
          : [
              { className: "h-4 w-16" },
              { className: "h-4 w-14" },
              { className: "h-4 w-20" },
              { className: "h-4 w-16" },
              { content: <div /> },
            ]
      }
      rows={
        selectedRow
          ? [
              [
                {
                  className:
                    "h-4 w-4 rounded-sm self-center justify-self-center",
                },
                { className: "h-14 w-full" },
                { className: "h-6 w-full" },
                { className: "h-7 w-24 rounded-full" },
                { className: "h-6 w-full" },
                {
                  className:
                    "h-10 w-10 self-center justify-self-center rounded-full",
                },
              ],
            ]
          : [
              { className: "h-14 w-full" },
              { className: "h-6 w-full" },
              { className: "h-7 w-24 rounded-full" },
              { className: "h-6 w-full" },
              {
                className:
                  "h-10 w-10 self-center justify-self-center rounded-full",
              },
            ]
      }
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
