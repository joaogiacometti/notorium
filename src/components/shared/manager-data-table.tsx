"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  type RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function shouldIgnoreRowClick(
  target: EventTarget | null,
  currentTarget: EventTarget | null,
) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const interactiveAncestor = target.closest(
    [
      "a",
      "button",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[role='link']",
      "[role='menuitem']",
      "[role='checkbox']",
      "[role='radio']",
      "[data-no-row-click]",
    ].join(", "),
  );

  return Boolean(
    interactiveAncestor &&
      interactiveAncestor instanceof HTMLElement &&
      interactiveAncestor !== currentTarget,
  );
}

interface ManagerDataTableProps<TRow> {
  data: TRow[];
  columns: ColumnDef<TRow>[];
  emptyLabel: string;
  getRowId: (row: TRow) => string;
  getRowAriaLabel?: (row: TRow) => string;
  getRowClassName?: (row: TRow) => string;
  nextLabel: string;
  onRowClick?: (row: TRow) => void;
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
  isLoading?: boolean;
  loadingLabel?: string;
  onSelectedRowIdsChange?: (rowIds: string[]) => void;
  pageCount?: number;
  pageSize?: number;
  selectedRowIds?: string[];
  selectionAriaLabel?: string;
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
  getRowAriaLabel,
  getRowClassName,
  nextLabel,
  onRowClick,
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
  isLoading = false,
  loadingLabel = "Loading...",
  onSelectedRowIdsChange,
  pageCount,
  pageSize = 25,
  selectedRowIds,
  selectionAriaLabel = "Select row",
  scrollAreaClassName,
  showColumnWidths = false,
  tableClassName,
  wrapperClassName,
}: Readonly<ManagerDataTableProps<TRow>>) {
  const pagination: PaginationState = {
    pageIndex,
    pageSize,
  };
  const rowSelection = Object.fromEntries(
    (selectedRowIds ?? []).map((rowId) => [rowId, true]),
  ) as RowSelectionState;

  const table = useReactTable({
    data,
    columns: onSelectedRowIdsChange
      ? [
          {
            id: "select",
            size: 36,
            header: ({ table }) => (
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected()
                      ? true
                      : table.getIsSomePageRowsSelected()
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) =>
                    table.toggleAllPageRowsSelected(Boolean(checked))
                  }
                  aria-label={selectionAriaLabel}
                  className="border-border/50 text-muted-foreground/60 opacity-80 transition-opacity hover:opacity-100 data-[state=checked]:border-primary data-[state=checked]:opacity-100"
                />
              </div>
            ),
            cell: ({ row }) => (
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(checked) =>
                    row.toggleSelected(Boolean(checked))
                  }
                  aria-label={selectionAriaLabel}
                  className="border-border/50 text-muted-foreground/60 opacity-70 transition-opacity hover:opacity-100 data-[state=checked]:border-primary data-[state=checked]:opacity-100"
                />
              </div>
            ),
            enableHiding: false,
          },
          ...columns,
        ]
      : columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      onPageIndexChange(nextPagination.pageIndex);
    },
    enableRowSelection: Boolean(onSelectedRowIdsChange),
    getRowId,
    onRowSelectionChange: (updater) => {
      if (!onSelectedRowIdsChange) {
        return;
      }

      const nextSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      const nextRowIds = Object.entries(nextSelection)
        .filter(([, selected]) => selected)
        .map(([rowId]) => rowId);

      onSelectedRowIdsChange(nextRowIds);
    },
    state: {
      pagination,
      rowSelection,
    },
    manualPagination: typeof pageCount === "number",
    pageCount,
    columnResizeMode,
  });

  const totalPageCount = Math.max(table.getPageCount(), 1);

  function handleRowClick(
    event: ReactMouseEvent<HTMLTableRowElement>,
    row: TRow,
  ) {
    if (
      !onRowClick ||
      shouldIgnoreRowClick(event.target, event.currentTarget)
    ) {
      return;
    }

    onRowClick(row);
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col lg:min-h-0 lg:flex-1",
        wrapperClassName,
      )}
      aria-busy={isLoading}
    >
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-y-auto",
          scrollAreaClassName,
        )}
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
                      header.column.id === "select"
                        ? "sticky top-0 z-10 h-12 border-b border-border/60 bg-muted/30 px-2"
                        : "sticky top-0 z-10 h-12 border-b border-border/60 bg-muted/30 px-3",
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
                  className={cn(
                    "border-b border-border/50 transition-colors duration-150 hover:bg-muted/20",
                    row.getIsSelected() ? "bg-muted/10" : null,
                    onRowClick
                      ? "cursor-pointer focus-visible:bg-muted/20 focus-visible:outline-none"
                      : null,
                    getRowClassName?.(row.original),
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "link" : undefined}
                  aria-label={getRowAriaLabel?.(row.original)}
                  onClick={
                    onRowClick
                      ? (event) => handleRowClick(event, row.original)
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (
                            shouldIgnoreRowClick(
                              event.target,
                              event.currentTarget,
                            )
                          ) {
                            return;
                          }

                          if (
                            event.key === "Enter" ||
                            event.key === " " ||
                            event.key === "Spacebar"
                          ) {
                            event.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.id === "select"
                          ? "px-2 py-3 align-middle"
                          : "px-3 py-3 align-middle",
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
        {isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/65 backdrop-blur-[1px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-xs">
              <Loader2 className="size-4 animate-spin" />
              <span>{loadingLabel}</span>
            </div>
          </div>
        ) : null}
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
            {pageLabel(pagination.pageIndex + 1, totalPageCount)}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={isLoading || !table.getCanPreviousPage()}
            className="rounded-full border-border/70 bg-background/80 px-4"
          >
            {prevLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={isLoading || !table.getCanNextPage()}
            className="rounded-full border-border/70 bg-background/80 px-4"
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
