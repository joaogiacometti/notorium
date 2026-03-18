import { Fragment, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface TableSkeletonCell {
  className?: string;
  content?: ReactNode;
}

interface TableSkeletonProps {
  columnTemplate: string;
  headers: TableSkeletonCell[];
  rowCount?: number;
  rows: TableSkeletonCell[] | TableSkeletonCell[][];
  footer?: TableSkeletonCell[];
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
  footerClassName?: string;
}

function normalizeRows(
  rows: TableSkeletonProps["rows"],
  rowCount: number,
): TableSkeletonCell[][] {
  if (rows.length === 0) {
    return [];
  }

  if (Array.isArray(rows[0])) {
    const nestedRows = rows as TableSkeletonCell[][];

    if (nestedRows.length === 1 && rowCount > 1) {
      return Array.from({ length: rowCount }, () => nestedRows[0]);
    }

    return nestedRows;
  }

  return Array.from({ length: rowCount }, () => rows as TableSkeletonCell[]);
}

function renderCell(
  cell: TableSkeletonCell,
  key: string,
  defaultClassName: string,
) {
  return (
    <Fragment key={key}>
      {cell.content ?? (
        <Skeleton className={cn(defaultClassName, cell.className)} />
      )}
    </Fragment>
  );
}

export function TableSkeleton({
  columnTemplate,
  headers,
  rowCount = 3,
  rows,
  footer,
  className,
  headerClassName,
  rowClassName,
  footerClassName,
}: Readonly<TableSkeletonProps>) {
  const normalizedRows = normalizeRows(rows, rowCount);

  return (
    <div className={className}>
      <div
        className={cn(
          "border-b border-border/60 bg-muted/30 px-4 py-4",
          headerClassName,
        )}
      >
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: columnTemplate }}
        >
          {headers.map((cell, index) =>
            renderCell(cell, `header-${index}`, "h-4 w-16"),
          )}
        </div>
      </div>
      <div className="space-y-0">
        {normalizedRows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex + 1}`}
            className={cn("border-b border-border/50 px-4 py-3", rowClassName)}
          >
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: columnTemplate }}
            >
              {row.map((cell, columnIndex) =>
                renderCell(
                  cell,
                  `row-${rowIndex + 1}-cell-${columnIndex + 1}`,
                  "h-14 w-full",
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      {footer ? (
        <div
          className={cn(
            "flex flex-col gap-2 border-t border-border/60 bg-muted/15 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end",
            footerClassName,
          )}
        >
          {footer.map((cell, index) =>
            renderCell(cell, `footer-${index + 1}`, "h-8 w-24 rounded-full"),
          )}
        </div>
      ) : null}
    </div>
  );
}
