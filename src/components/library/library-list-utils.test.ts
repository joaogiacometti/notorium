import { describe, expect, it } from "vitest";
import {
  getColumnClassName,
  getVisibleBooks,
} from "@/components/library/library-list-utils";
import type { LibraryBookEntity } from "@/lib/server/api-contracts";

function makeBook(
  overrides: Partial<LibraryBookEntity> &
    Pick<LibraryBookEntity, "id" | "title">,
): LibraryBookEntity {
  return {
    userId: "user-1",
    author: null,
    fileName: "book.pdf",
    blobPathname: "library/user-1/book.pdf",
    sizeBytes: 1024,
    totalPages: null,
    currentPage: 1,
    lastReadAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("getColumnClassName", () => {
  it("returns the mapped class for each known column", () => {
    expect(getColumnClassName("select")).toContain("w-8");
    expect(getColumnClassName("title")).toContain("max-w-[10rem]");
    expect(getColumnClassName("author")).toContain("sm:table-cell");
    expect(getColumnClassName("progress")).toContain("w-28");
    expect(getColumnClassName("lastRead")).toContain("md:table-cell");
    expect(getColumnClassName("actions")).toContain("w-10");
  });

  it("returns an empty string for an unknown column", () => {
    expect(getColumnClassName("unknown")).toBe("");
  });
});

describe("getVisibleBooks", () => {
  const pragmatic = makeBook({
    id: "a",
    title: "The Pragmatic Programmer",
    author: "Hunt & Thomas",
  });
  const cleanCode = makeBook({
    id: "b",
    title: "Clean Code",
    author: "Robert Martin",
  });
  const noAuthor = makeBook({ id: "c", title: "Anonymous Notes" });
  const all = [pragmatic, cleanCode, noAuthor];

  it("returns every book when the query is empty", () => {
    expect(getVisibleBooks(all, "")).toEqual(all);
  });

  it("treats a whitespace-only query as empty", () => {
    expect(getVisibleBooks(all, "   ")).toEqual(all);
  });

  it("matches case-insensitively against the title", () => {
    const result = getVisibleBooks(all, "PRAGMATIC");
    expect(result.map((book) => book.id)).toEqual(["a"]);
  });

  it("matches against the author", () => {
    const result = getVisibleBooks(all, "martin");
    expect(result.map((book) => book.id)).toEqual(["b"]);
  });

  it("does not match books without an author when searching author text", () => {
    const result = getVisibleBooks(all, "hunt");
    expect(result.map((book) => book.id)).toEqual(["a"]);
  });

  it("preserves the incoming order", () => {
    const result = getVisibleBooks(all, "o");
    expect(result.map((book) => book.id)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(getVisibleBooks(all, "zzz")).toEqual([]);
  });
});
