"use client";

import { type RowData, Subscribe } from "@tanstack/react-table";
import type {
  ManagerColumnDef,
  ManagerTableInstance,
  ManagerTableRow,
} from "@/components/shared/manager-table-features";
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
 * Ignore interactive controls, portaled content, and background rows disabled
 * by a modal so editing a row never triggers row-level navigation.
 *
 * @example
 *   shouldIgnoreRowClick(event.target, event.currentTarget)
 */
export function shouldIgnoreRowClick(
  target: EventTarget | null,
  currentTarget: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  // Block background clicks while a modal is open as well as React portal
  // events, which bubble through the component tree outside the row's DOM.
  if (
    currentTarget instanceof Element &&
    (currentTarget.closest('[aria-hidden="true"], [inert]') ||
      !currentTarget.contains(target))
  ) {
    return true;
  }

  const interactiveAncestor = target.closest(interactiveSelectors);

  return Boolean(interactiveAncestor && interactiveAncestor !== currentTarget);
}

type SelectAllCheckedState = boolean | "indeterminate";

/**
 * Header checkbox state for the rows on the current page. Call it from the
 * component that owns `useTable`, so it re-reads on every table state or data
 * change.
 *
 * @example
 *   const selectAllChecked = readSelectAllCheckedState(table);
 */
export function readSelectAllCheckedState<TRow extends RowData>(
  table: Pick<
    ManagerTableInstance<TRow>,
    "getIsAllPageRowsSelected" | "getIsSomePageRowsSelected"
  >,
): SelectAllCheckedState {
  if (table.getIsAllPageRowsSelected()) return true;
  if (table.getIsSomePageRowsSelected()) return "indeterminate";
  return false;
}

interface SelectAllCheckboxProps {
  checked: SelectAllCheckedState;
  onCheckedChange: (checked: boolean) => void;
  selectionAriaLabel: string;
}

/**
 * Header checkbox of the select column. It takes `checked` as a prop instead
 * of reading the table: which rows are on the page depends on `data`, which is
 * not table state, so no TanStack `Subscribe` source can report it.
 *
 * @example
 *   <SelectAllCheckbox
 *     checked={readSelectAllCheckedState(table)}
 *     onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
 *     selectionAriaLabel="Select row"
 *   />
 */
export function SelectAllCheckbox({
  checked,
  onCheckedChange,
  selectionAriaLabel,
}: Readonly<SelectAllCheckboxProps>) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Checkbox
        checked={checked}
        onCheckedChange={(nextChecked) => onCheckedChange(Boolean(nextChecked))}
        aria-label={selectionAriaLabel}
        className="pointer-events-none border-border/50 text-muted-foreground/60 opacity-80 transition-opacity hover:opacity-100 data-[state=checked]:border-primary data-[state=checked]:opacity-100"
      />
    </div>
  );
}

// `row` is a stable object, so React Compiler memoizes a render that only
// reads selection through `row.getIsSelected()` and the checkbox freezes on
// its first value. TanStack Table 9 requires the state read to sit inside a
// `Subscribe` boundary in the component that hides it (regression from the
// v9 upgrade in 282d5b8).
function SelectColumnCell<TRow extends RowData>({
  row,
  selectionAriaLabel,
}: Readonly<{ row: ManagerTableRow<TRow>; selectionAriaLabel: string }>) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Subscribe
        source={row.table.atoms.rowSelection}
        selector={(rowSelection) => Boolean(rowSelection[row.id])}
      >
        {(checked) => (
          <Checkbox
            checked={checked}
            onCheckedChange={(nextChecked) =>
              row.toggleSelected(Boolean(nextChecked))
            }
            aria-label={selectionAriaLabel}
            className="pointer-events-none border-border/50 text-muted-foreground/60 opacity-70 transition-opacity hover:opacity-100 data-[state=checked]:border-primary data-[state=checked]:opacity-100"
          />
        )}
      </Subscribe>
    </div>
  );
}

export function getSelectColumn<TRow extends RowData>(
  selectionAriaLabel: string,
): ManagerColumnDef<TRow> {
  return {
    id: "select",
    size: 36,
    cell: ({ row }) => (
      <SelectColumnCell<TRow>
        row={row}
        selectionAriaLabel={selectionAriaLabel}
      />
    ),
  };
}
