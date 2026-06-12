import { describe, expect, it } from "vitest";
import { shouldIgnoreRowClick } from "@/components/shared/manager-data-table-helpers";

function buildRow(innerHTML: string): HTMLElement {
  const row = document.createElement("tr");
  row.innerHTML = innerHTML;
  return row;
}

describe("shouldIgnoreRowClick", () => {
  it("returns false for a non-interactive target", () => {
    const row = buildRow("<td><span>cell</span></td>");
    const span = row.querySelector("span") as HTMLElement;
    expect(shouldIgnoreRowClick(span, row)).toBe(false);
  });

  it("returns true when the click lands on a button", () => {
    const row = buildRow("<td><button>act</button></td>");
    const button = row.querySelector("button") as HTMLElement;
    expect(shouldIgnoreRowClick(button, row)).toBe(true);
  });

  it("returns true for an element flagged with data-no-row-click", () => {
    const row = buildRow("<td data-no-row-click><span>x</span></td>");
    const span = row.querySelector("span") as HTMLElement;
    expect(shouldIgnoreRowClick(span, row)).toBe(true);
  });

  it("returns false when the only match is the current row itself", () => {
    const row = document.createElement("tr");
    row.setAttribute("role", "link");
    expect(shouldIgnoreRowClick(row, row)).toBe(false);
  });

  it("returns false when target is not an element", () => {
    expect(shouldIgnoreRowClick(null, null)).toBe(false);
  });
});
