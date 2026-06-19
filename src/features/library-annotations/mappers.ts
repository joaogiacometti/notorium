import type { InferSelectModel } from "drizzle-orm";
import type { libraryAnnotation } from "@/db/schema";
import type { BookAnnotationDto } from "@/features/library-annotations/types";
import type { HighlightAnnotationInput } from "@/features/library-annotations/validation";

type LibraryAnnotationRow = InferSelectModel<typeof libraryAnnotation>;

// Fields stored as ISO strings in the JSON column but expected as `Date` by the
// reader's import API.
const DATE_FIELDS = ["created", "modified"] as const;

/**
 * Revives a stored annotation row into the shape the reader imports. The JSON
 * column keeps `created`/`modified` as ISO strings; EmbedPDF expects `Date`, so
 * they are revived here.
 *
 * @example
 * toBookAnnotationDto(row); // { uid, pageIndex, annotation: { …, created: Date } }
 */
export function toBookAnnotationDto(
  row: LibraryAnnotationRow,
): BookAnnotationDto {
  const stored = row.data as Record<string, unknown>;
  const annotation: Record<string, unknown> = { ...stored };

  for (const field of DATE_FIELDS) {
    const value = annotation[field];
    if (typeof value === "string") {
      annotation[field] = new Date(value);
    }
  }

  return { uid: row.annotationUid, pageIndex: row.pageIndex, annotation };
}

/**
 * Builds the insert/update values for persisting a validated highlight. The
 * annotation is stored verbatim as JSON (its date fields are already ISO
 * strings after the client serializes the object).
 */
export function toAnnotationValues(
  userId: string,
  bookId: string,
  annotation: HighlightAnnotationInput,
) {
  return {
    userId,
    bookId,
    annotationUid: annotation.id,
    pageIndex: annotation.pageIndex,
    data: annotation,
  };
}
