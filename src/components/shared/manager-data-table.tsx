"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
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
import { cn } from "@/lib/utils";

interface ManagerDataTableProps<TRow> {
  data: TRow[];
  columns: ColumnDef<TRow>[];
  emptyLabel: string;
  getRowId: (row: TRow) => string;
  nextLabel: string;
  onPageIndexChange: (pageIndex: number) => void;
  pageIndex: number;
  pageLabel: (current: number, total: number) => string;
  prevLabel: string;
  columnResizeMode?: "onChange" | "onEnd";
  controlsClassName?: string;
  footerClassName?: string;
  footerLeading?: ReactNode;
  getBodyCellClassName?: (columnId: string) => string;
  getHeaderCellClassName?: (columnId: string) => string;
  pageSize?: number;
  scrollAreaClassName?: string;
  showColumnWidths?: boolean;
  tableClassName?: string;
  wrapperClassName?: string;
}

export function ManagerDataTable<TRow>({
  data,
  columns,
  emptyLabel,
  getRowId,
  nextLabel,
  onPageIndexChange,
  pageIndex,
  pageLabel,
  prevLabel,
  columnResizeMode,
  controlsClassName,
  footerClassName,
  footerLeading,
  getBodyCellClassName,
  getHeaderCellClassName,
  pageSize = 25,
  scrollAreaClassName,
  showColumnWidths = false,
  tableClassName,
  wrapperClassName,
}: Readonly<ManagerDataTableProps<TRow>>) {
  const pagination: PaginationState = {
    pageIndex,
    pageSize,
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      onPageIndexChange(nextPagination.pageIndex);
    },
    getRowId,
    state: {
      pagination,
    },
    columnResizeMode,
  });

  const pageCount = Math.max(table.getPageCount(), 1);

  return (
    <div
      className={cn(
        "flex h-full flex-col lg:min-h-0 lg:flex-1",
        wrapperClassName,
      )}
    >
      <div
        className={cn("min-h-0 flex-1 overflow-y-auto", scrollAreaClassName)}
      >
        <Table className={tableClassName}>
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
                      getHeaderCellClassName?.(header.column.id),
                    )}
                    style={
                      showColumnWidths
                        ? {
                            width: header.getSize(),
                          }
                        : undefined
                    }
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
                        "px-3 py-3 align-middle",
                        getBodyCellClassName?.(cell.column.id),
                      )}
                      style={
                        showColumnWidths
                          ? {
                              width: cell.column.getSize(),
                            }
                          : undefined
                      }
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
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div
        className={cn(
          "flex flex-col gap-2 border-t border-border/60 bg-muted/15 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end",
          footerClassName,
        )}
      >
        {footerLeading}
        <div
          className={cn(
            "flex flex-col gap-2 sm:flex-row sm:items-center",
            controlsClassName,
          )}
        >
          <Badge
            variant="outline"
            className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-muted-foreground"
          >
            {pageLabel(pagination.pageIndex + 1, pageCount)}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-full border-border/70 bg-background/80 px-4"
          >
            {prevLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-full border-border/70 bg-background/80 px-4"
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
