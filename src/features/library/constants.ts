export const LIBRARY_BOOK_MIME = "application/pdf";

/**
 * Reports whether a MIME type is an accepted library book format. Only PDF is
 * supported in the first version of the library.
 *
 * @example
 * isSupportedLibraryBookMime("application/pdf"); // true
 */
export function isSupportedLibraryBookMime(value: string): boolean {
  return value.trim().toLowerCase() === LIBRARY_BOOK_MIME;
}

/**
 * Formats a human-readable reading-progress label for a book card or header.
 * Omits the total when it has not been captured from the PDF yet.
 *
 * @example
 * formatReadingProgress(42, 380); // "Page 42 of 380"
 */
export function formatReadingProgress(
  currentPage: number,
  totalPages: number | null,
): string {
  if (totalPages && totalPages > 0) {
    return `Page ${currentPage} of ${totalPages}`;
  }
  return `Page ${currentPage}`;
}
