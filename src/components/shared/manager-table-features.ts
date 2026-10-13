import {
  type ColumnDef,
  columnSizingFeature,
  createPaginatedRowModel,
  type Row,
  type RowData,
  rowPaginationFeature,
  rowSelectionFeature,
  type Table,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * TanStack Table features every manager table registers: column widths,
 * pagination, and row selection. TanStack Table v9 only exposes the APIs of
 * registered features, so column definitions must be typed against this set.
 *
 * @example
 * const table = useTable({ features: managerTableFeatures, columns, data });
 */
export const managerTableFeatures = tableFeatures({
  columnSizingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

type ManagerTableFeatures = typeof managerTableFeatures;

export type ManagerColumnDef<TRow extends RowData> = ColumnDef<
  ManagerTableFeatures,
  TRow
>;

export type ManagerTableRow<TRow extends RowData> = Row<
  ManagerTableFeatures,
  TRow
>;

export type ManagerTableInstance<TRow extends RowData> = Table<
  ManagerTableFeatures,
  TRow
>;
