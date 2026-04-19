import type { ColumnDef } from "@tanstack/react-table";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManagerDataTable } from "@/components/shared/manager-data-table";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

interface TestRow {
  id: string;
  label: string;
}

const columns: ColumnDef<TestRow>[] = [
  {
    accessorKey: "label",
    header: "Label",
    cell: ({ row }) => row.original.label,
  },
];

describe("ManagerDataTable", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("keeps the empty state in a full-height table container", async () => {
    await act(async () => {
      root.render(
        <div className="h-96">
          <ManagerDataTable
            data={[]}
            columns={columns}
            emptyLabel="No rows"
            getRowId={(row) => row.id}
            nextLabel="Next"
            onPageIndexChange={() => {}}
            pageIndex={0}
            pageLabel={(current, total) => `Page ${current} of ${total}`}
            prevLabel="Previous"
          />
        </div>,
      );
    });

    const tableContainer = container.querySelector(
      '[data-slot="table-container"]',
    );
    const tableBody = container.querySelector('[data-slot="table-body"]');
    const emptyRow = container.querySelector(
      '[data-slot="table-body"] [data-slot="table-row"]',
    );
    const emptyCell = container.querySelector(
      '[data-slot="table-body"] [data-slot="table-cell"]',
    );
    const emptyContent = container.querySelector(
      '[data-slot="table-body"] [data-slot="table-cell"] > div',
    );

    expect(tableContainer?.className).toContain("min-h-full");
    expect(tableBody?.className).toContain("h-full");
    expect(emptyRow?.className).toContain("h-full");
    expect(emptyCell?.className).toContain("h-full");
    expect(emptyContent?.className).toContain("min-h-36");
    expect(emptyContent?.className).toContain("h-full");
  });

  it("toggles selection from the select cell without triggering row navigation", async () => {
    const onRowClick = vi.fn();
    const onSelectedRowIdsChange = vi.fn();

    await act(async () => {
      root.render(
        <ManagerDataTable
          data={[{ id: "row-1", label: "Alpha" }]}
          columns={columns}
          emptyLabel="No rows"
          getRowId={(row) => row.id}
          nextLabel="Next"
          onPageIndexChange={() => {}}
          onRowClick={onRowClick}
          onSelectedRowIdsChange={onSelectedRowIdsChange}
          pageIndex={0}
          pageLabel={(current, total) => `Page ${current} of ${total}`}
          prevLabel="Previous"
          selectedRowIds={[]}
          selectionAriaLabel="Select row"
        />,
      );
    });

    const selectCellButton = container.querySelector(
      '[data-slot="table-body"] [data-no-row-click]',
    );

    expect(selectCellButton).toBeTruthy();

    await act(async () => {
      selectCellButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(onSelectedRowIdsChange).toHaveBeenCalledWith(["row-1"]);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("keeps row navigation on regular cells when selection is enabled", async () => {
    const onRowClick = vi.fn();

    await act(async () => {
      root.render(
        <ManagerDataTable
          data={[{ id: "row-1", label: "Alpha" }]}
          columns={columns}
          emptyLabel="No rows"
          getRowId={(row) => row.id}
          nextLabel="Next"
          onPageIndexChange={() => {}}
          onRowClick={onRowClick}
          onSelectedRowIdsChange={() => {}}
          pageIndex={0}
          pageLabel={(current, total) => `Page ${current} of ${total}`}
          prevLabel="Previous"
          selectedRowIds={[]}
          selectionAriaLabel="Select row"
        />,
      );
    });

    const labelCell = container.querySelector(
      '[data-slot="table-body"] [data-slot="table-row"] [data-slot="table-cell"]:nth-child(2)',
    );

    expect(labelCell).toBeTruthy();

    await act(async () => {
      labelCell?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(onRowClick).toHaveBeenCalledWith({ id: "row-1", label: "Alpha" });
  });
});
