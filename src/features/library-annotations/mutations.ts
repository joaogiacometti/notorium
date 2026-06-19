import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { libraryAnnotation } from "@/db/schema";
import { getBookByIdForUser } from "@/features/library/queries";
import { toAnnotationValues } from "@/features/library-annotations/mappers";
import { countAnnotationsForBook } from "@/features/library-annotations/queries";
import type {
  DeleteAnnotationForm,
  SaveAnnotationForm,
} from "@/features/library-annotations/validation";
import { LIMITS } from "@/lib/config/limits";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

type SaveResult = { success: true } | ActionErrorResult;

// Rejects a brand-new highlight once the per-book cap is reached. Edits to an
// existing highlight (same uid) never count against the cap, so a full book
// stays editable.
async function ensureUnderAnnotationLimit(
  userId: string,
  bookId: string,
  annotationUid: string,
): Promise<ActionErrorResult | null> {
  const existing = await getDb()
    .select({ id: libraryAnnotation.id })
    .from(libraryAnnotation)
    .where(
      and(
        eq(libraryAnnotation.bookId, bookId),
        eq(libraryAnnotation.annotationUid, annotationUid),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return null;
  }

  if (
    (await countAnnotationsForBook(userId, bookId)) >=
    LIMITS.maxAnnotationsPerBook
  ) {
    return actionError("library.annotationLimit", {
      errorParams: { max: LIMITS.maxAnnotationsPerBook },
    });
  }

  return null;
}

/**
 * Persists a highlight (and its note, carried in `contents`) for the owner of
 * the book. Upserts on `(bookId, annotationUid)` so the reader can fire the same
 * save on create and on every later edit without tracking which is which.
 */
export async function saveAnnotationForUser(
  userId: string,
  data: SaveAnnotationForm,
): Promise<SaveResult> {
  const book = await getBookByIdForUser(userId, data.bookId);
  if (!book) {
    return actionError("library.notFound");
  }

  const limitError = await ensureUnderAnnotationLimit(
    userId,
    data.bookId,
    data.annotation.id,
  );
  if (limitError) {
    return limitError;
  }

  const values = toAnnotationValues(userId, data.bookId, data.annotation);

  await getDb()
    .insert(libraryAnnotation)
    .values(values)
    .onConflictDoUpdate({
      target: [libraryAnnotation.bookId, libraryAnnotation.annotationUid],
      set: { data: values.data, pageIndex: values.pageIndex },
    });

  return { success: true };
}

export async function deleteAnnotationForUser(
  userId: string,
  data: DeleteAnnotationForm,
): Promise<SaveResult> {
  await getDb()
    .delete(libraryAnnotation)
    .where(
      and(
        eq(libraryAnnotation.userId, userId),
        eq(libraryAnnotation.bookId, data.bookId),
        eq(libraryAnnotation.annotationUid, data.annotationUid),
      ),
    );

  return { success: true };
}
