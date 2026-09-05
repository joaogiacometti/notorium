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

  it("ignores portaled status options and dialog content outside the row", () => {
    const row = buildRow("<td>Assessment</td>");
    const option = document.createElement("div");
    option.setAttribute("role", "option");
    option.textContent = "Completed";
    expect(shouldIgnoreRowClick(option, row)).toBe(true);
    expect(shouldIgnoreRowClick(document.createElement("span"), row)).toBe(
      true,
    );
  });

  it("ignores SVG icons inside row action buttons", () => {
    const row = buildRow("<td><button><svg><path /></svg></button></td>");
    expect(shouldIgnoreRowClick(row.querySelector("path"), row)).toBe(true);
  });

  it("returns false when target is not an element", () => {
    expect(shouldIgnoreRowClick(null, null)).toBe(false);
  });

  it.each([
    "aria-hidden",
    "inert",
  ])("ignores a background row click while its table is %s", (attribute) => {
    const background = document.createElement("div");
    background.setAttribute(attribute, "true");
    const row = buildRow("<td>Another assessment</td>");
    background.appendChild(row);
    expect(shouldIgnoreRowClick(row.querySelector("td"), row)).toBe(true);
    background.removeAttribute(attribute);
    expect(shouldIgnoreRowClick(row.querySelector("td"), row)).toBe(false);
  });
});
