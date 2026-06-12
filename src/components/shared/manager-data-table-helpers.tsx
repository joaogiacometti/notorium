"use client";

import type {
  ColumnDef,
  Row,
  Table as TanstackTable,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

const interactiveSelectors = [
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
].join(", ");

/**
 * True when a row click originated on an interactive descendant (link, button,
 * checkbox, etc.) so row-level navigation should defer to that control.
 *
 * @example
 *   shouldIgnoreRowClick(event.target, event.currentTarget)
 */
export function shouldIgnoreRowClick(
  target: EventTarget | null,
  currentTarget: EventTarget | null,
): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const interactiveAncestor = target.closest(interactiveSelectors);

  return Boolean(
    interactiveAncestor &&
      interactiveAncestor instanceof HTMLElement &&
      interactiveAncestor !== currentTarget,
  );
}

function SelectColumnHeader<TRow>({
  table,
  selectionAriaLabel,
}: Readonly<{ table: TanstackTable<TRow>; selectionAriaLabel: string }>) {
  let checked: boolean | "indeterminate" = false;
  if (table.getIsAllPageRowsSelected()) checked = true;
  else if (table.getIsSomePageRowsSelected()) checked = "indeterminate";

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Checkbox
        checked={checked}
        onCheckedChange={(checked) =>
          table.toggleAllPageRowsSelected(Boolean(checked))
        }
        aria-label={selectionAriaLabel}
        className="pointer-events-none border-border/50 text-muted-foreground/60 opacity-80 transition-opacity hover:opacity-100 data-[state=checked]:border-primary data-[state=checked]:opacity-100"
      />
    </div>
  );
}

function SelectColumnCell<TRow>({
  row,
  selectionAriaLabel,
}: Readonly<{ row: Row<TRow>; selectionAriaLabel: string }>) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
        aria-label={selectionAriaLabel}
        className="pointer-events-none border-border/50 text-muted-foreground/60 opacity-70 transition-opacity hover:opacity-100 data-[state=checked]:border-primary data-[state=checked]:opacity-100"
      />
    </div>
  );
}

export function getSelectColumn<TRow>(
  selectionAriaLabel: string,
): ColumnDef<TRow> {
  return {
    id: "select",
    size: 36,
    header: ({ table }) => (
      <SelectColumnHeader<TRow>
        table={table}
        selectionAriaLabel={selectionAriaLabel}
      />
    ),
    cell: ({ row }) => (
      <SelectColumnCell<TRow>
        row={row}
        selectionAriaLabel={selectionAriaLabel}
      />
    ),
    enableHiding: false,
  };
}
