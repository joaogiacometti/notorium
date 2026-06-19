import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { libraryAnnotation } from "@/db/schema";
import { toBookAnnotationDto } from "@/features/library-annotations/mappers";
import type { BookAnnotationDto } from "@/features/library-annotations/types";

/**
 * Loads every highlight a user has saved in one book, ordered by page so the
 * reader imports them top-to-bottom. Scoped by `userId` so a book id alone can
 * never surface another user's annotations.
 */
export async function getAnnotationsForBook(
  userId: string,
  bookId: string,
): Promise<BookAnnotationDto[]> {
  const rows = await getDb()
    .select()
    .from(libraryAnnotation)
    .where(
      and(
        eq(libraryAnnotation.userId, userId),
        eq(libraryAnnotation.bookId, bookId),
      ),
    )
    .orderBy(asc(libraryAnnotation.pageIndex));

  return rows.map(toBookAnnotationDto);
}

export async function countAnnotationsForBook(
  userId: string,
  bookId: string,
): Promise<number> {
  const rows = await getDb()
    .select({ uid: libraryAnnotation.annotationUid })
    .from(libraryAnnotation)
    .where(
      and(
        eq(libraryAnnotation.userId, userId),
        eq(libraryAnnotation.bookId, bookId),
      ),
    );

  return rows.length;
}
