"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { BookOpen, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import type {
  FlashcardEntity,
  FlashcardListEntity,
} from "@/lib/server/api-contracts";
import { FlashcardsTableRowActions } from "./flashcards-table-row-actions";

interface FlashcardsManagerTableProps {
  flashcards: FlashcardListEntity[];
  pageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
  onDeleted: (id: string) => void;
  onUpdated: (flashcard: FlashcardEntity) => void;
}

function getColumns(
  onUpdated: (flashcard: FlashcardEntity) => void,
  onDeleted: (id: string) => void,
  t: ReturnType<typeof useTranslations>,
): ColumnDef<FlashcardListEntity>[] {
  return [
    {
      accessorKey: "front",
      size: 272,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("table_front")}
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
              title={getRichTextExcerpt(row.original.front, 240)}
            >
              {getRichTextExcerpt(row.original.front, 140)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "back",
      size: 200,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("table_back")}
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="min-w-0 truncate py-1 text-sm leading-6 text-muted-foreground"
          title={getRichTextExcerpt(row.original.back, 280)}
        >
          {getRichTextExcerpt(row.original.back, 180)}
        </div>
      ),
    },
    {
      accessorKey: "subjectName",
      size: 112,
      header: () => (
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("table_subject")}
        </div>
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="max-w-[7.5rem] rounded-full border-border/70 bg-muted/35 px-2.5 py-1 text-muted-foreground"
        >
          <BookOpen className="size-3.5" />
          <span className="truncate">{row.original.subjectName}</span>
        </Badge>
      ),
    },
    {
      id: "actions",
      size: 56,
      header: () => <div className="flex w-14 min-w-14 justify-start" />,
      cell: ({ row }) => (
        <div className="flex w-14 min-w-14 items-center justify-start">
          <FlashcardsTableRowActions
            flashcard={row.original}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        </div>
      ),
      enableHiding: false,
    },
  ];
}

export function FlashcardsManagerTable({
  flashcards,
  pageIndex,
  onPageIndexChange,
  onDeleted,
  onUpdated,
}: Readonly<FlashcardsManagerTableProps>) {
  const t = useTranslations("FlashcardsManager");
  const pagination: PaginationState = {
    pageIndex,
    pageSize: 25,
  };

  const table = useReactTable({
    data: flashcards,
    columns: getColumns(onUpdated, onDeleted, t),
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
                  {t("no_results")}
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
          {t("page", {
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
          {t("prev")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="rounded-full border-border/70 bg-background/80 px-4"
        >
          {t("next")}
        </Button>
      </div>
    </div>
  );
}
