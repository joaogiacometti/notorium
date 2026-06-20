import type { CellContext, HeaderContext } from "@tanstack/react-table";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getLibraryColumns } from "@/components/library/library-table-columns";
import type { LibraryBookEntity } from "@/lib/server/api-contracts";

function makeBook(
  overrides: Partial<LibraryBookEntity> = {},
): LibraryBookEntity {
  return {
    id: "book-1",
    userId: "user-1",
    title: "The Pragmatic Programmer",
    author: "Hunt & Thomas",
    fileName: "book.pdf",
    blobPathname: "library/user-1/book.pdf",
    sizeBytes: 1024,
    totalPages: 380,
    currentPage: 42,
    zoomMobile: null,
    zoomDesktop: null,
    lastReadAt: new Date("2024-05-01"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function columns() {
  return getLibraryColumns({
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    hasSelection: false,
  });
}

function renderCell(
  column: ReturnType<typeof columns>[number],
  book: LibraryBookEntity,
): string {
  const cell = column.cell as (
    context: CellContext<LibraryBookEntity, unknown>,
  ) => ReactElement;
  return renderToStaticMarkup(
    cell({ row: { original: book } } as CellContext<
      LibraryBookEntity,
      unknown
    >),
  );
}

function renderHeader(column: ReturnType<typeof columns>[number]): string {
  const header = column.header as (
    context: HeaderContext<LibraryBookEntity, unknown>,
  ) => ReactElement;
  return renderToStaticMarkup(
    header({} as HeaderContext<LibraryBookEntity, unknown>),
  );
}

describe("getLibraryColumns", () => {
  it("returns the expected column set", () => {
    const ids = columns().map(
      (column) =>
        column.id ?? ("accessorKey" in column ? column.accessorKey : undefined),
    );
    expect(ids).toEqual(["title", "author", "progress", "lastRead", "actions"]);
  });

  it("renders every header label", () => {
    const headers = columns().map(renderHeader);
    expect(headers[0]).toContain("Book");
    expect(headers[1]).toContain("Author");
    expect(headers[2]).toContain("Progress");
    expect(headers[3]).toContain("Last read");
  });

  it("renders the title and reading progress", () => {
    const cols = columns();
    expect(renderCell(cols[0], makeBook())).toContain(
      "The Pragmatic Programmer",
    );
    expect(renderCell(cols[2], makeBook())).toContain("Page 42 of 380");
  });

  it("renders a placeholder for a missing author", () => {
    const cols = columns();
    expect(renderCell(cols[1], makeBook({ author: null }))).toContain("—");
  });

  it("renders the not-started state when the book was never opened", () => {
    const cols = columns();
    expect(renderCell(cols[3], makeBook({ lastReadAt: null }))).toContain(
      "Not started",
    );
  });

  it("renders the actions menu trigger", () => {
    const cols = columns();
    expect(renderCell(cols[4], makeBook())).toContain("Open book actions");
  });
});
