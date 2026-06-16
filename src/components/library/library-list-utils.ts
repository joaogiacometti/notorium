import type { LibraryBookEntity } from "@/lib/server/api-contracts";

export function getColumnClassName(columnId: string): string {
  switch (columnId) {
    case "select":
      return "w-8 min-w-8 sm:w-9 sm:min-w-9";
    case "title":
      return "min-w-0 max-w-[10rem] sm:min-w-[12rem] sm:max-w-none";
    case "author":
      return "hidden min-w-0 max-w-[8rem] sm:table-cell sm:min-w-[8rem] sm:max-w-none";
    case "progress":
      return "hidden sm:table-cell w-28 min-w-28";
    case "lastRead":
      return "hidden w-28 min-w-28 md:table-cell";
    case "actions":
      return "w-10 min-w-10 sm:w-14 sm:min-w-14";
    default:
      return "";
  }
}

function matchesSearch(book: LibraryBookEntity, search: string): boolean {
  if (!search) return true;

  return (
    book.title.toLowerCase().includes(search) ||
    (book.author?.toLowerCase().includes(search) ?? false)
  );
}

/**
 * Filters books by a case-insensitive match against title or author. Preserves
 * the incoming order (already sorted by recency from the query layer).
 *
 * @example
 * getVisibleBooks(books, "pragmatic"); // books whose title/author match
 */
export function getVisibleBooks(
  books: LibraryBookEntity[],
  searchQuery: string,
): LibraryBookEntity[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();

  return books.filter((book) => matchesSearch(book, normalizedSearch));
}
