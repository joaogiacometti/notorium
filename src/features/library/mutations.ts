import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { libraryBook } from "@/db/schema";
import type {
  MoveDocumentMutationInput,
  MoveDocumentResult,
} from "@/features/documents/types";
import { isSupportedLibraryBookMime } from "@/features/library/constants";
import {
  countBooksForUser,
  getBookByIdForUser,
} from "@/features/library/queries";
import { validateBookBlobPath } from "@/features/library/utils";
import type {
  CreateBookForm,
  DeleteBookForm,
  UpdateBookForm,
  UpdateBookZoomForm,
  UpdateReadingPageForm,
} from "@/features/library/validation";
import { getSubjectByIdForUser } from "@/features/subjects/queries";
import { LIMITS } from "@/lib/config/limits";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";
import { consumeUserDailyRateLimit } from "@/lib/rate-limit/user-rate-limit";
import type { LibraryBookEntity } from "@/lib/server/api-contracts";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

export type CreateBookResult =
  | { success: true; book: LibraryBookEntity }
  | ActionErrorResult;

function validateBookUpload(
  data: CreateBookForm,
  userId: string,
): ActionErrorResult | null {
  if (!isSupportedLibraryBookMime(data.mimeType)) {
    return actionError("library.mimeTypeNotAllowed");
  }

  if (!validateBookBlobPath(userId, data.blobPathname)) {
    return actionError("library.invalidData");
  }

  if (data.sizeBytes > LIMITS.libraryBookMaxBytes) {
    return actionError("limits.bookSizeLimit", {
      errorParams: { max: LIMITS.libraryBookMaxBytes },
    });
  }

  return null;
}

// Verifies the per-user book limit, that storage is configured, and that the
// daily upload rate limit has room.
async function ensureBookUploadAllowed(
  userId: string,
): Promise<ActionErrorResult | null> {
  if ((await countBooksForUser(userId)) >= LIMITS.maxBooksPerUser) {
    return actionError("limits.bookLimit", {
      errorParams: { max: LIMITS.maxBooksPerUser },
    });
  }

  const provider = await getMediaStorageProvider();

  if (!provider) {
    return actionError("library.notConfigured");
  }

  const rateLimit = await consumeUserDailyRateLimit({
    prefix: LIMITS.libraryUploadRateLimitPrefix,
    userId,
    limit: LIMITS.libraryUploadRateLimitPerDay,
    errorCode: "auth.rateLimited",
  });

  if (rateLimit.limited) {
    return actionError(rateLimit.errorCode);
  }

  return null;
}

async function storeUploadedBook(
  userId: string,
  data: CreateBookForm,
): Promise<CreateBookResult> {
  try {
    const [book] = await getDb()
      .insert(libraryBook)
      .values({
        userId,
        subjectId: data.subjectId,
        title: data.title,
        author: data.author ?? null,
        fileName: data.fileName,
        blobPathname: data.blobPathname,
        sizeBytes: data.sizeBytes,
      })
      .returning();

    return { success: true, book };
  } catch {
    await deleteBookBlob(data.blobPathname);

    return actionError("library.uploadFailed");
  }
}

async function deleteBookBlob(pathname: string): Promise<boolean> {
  return deleteBookBlobs([pathname]);
}

async function deleteBookBlobs(pathnames: string[]): Promise<boolean> {
  if (pathnames.length === 0) {
    return true;
  }

  const provider = await getMediaStorageProvider();

  if (!provider) {
    return false;
  }

  try {
    await provider.deleteFiles({ pathnames });
    return true;
  } catch {
    return false;
  }
}

export async function createBookForUser(
  userId: string,
  data: CreateBookForm,
): Promise<CreateBookResult> {
  const validationError = validateBookUpload(data, userId);
  if (validationError) {
    return validationError;
  }

  if (!(await getSubjectByIdForUser(userId, data.subjectId))) {
    return actionError("library.invalidData");
  }

  const blockError = await ensureBookUploadAllowed(userId);
  if (blockError) {
    return blockError;
  }

  return storeUploadedBook(userId, data);
}

// Clamps a requested page into [1, totalPages] so a stale or out-of-range
// client value can never persist a position past the end of the book.
function clampPage(page: number, totalPages: number | null): number {
  if (totalPages && totalPages > 0) {
    return Math.min(Math.max(page, 1), totalPages);
  }

  return Math.max(page, 1);
}

export async function updateReadingPageForUser(
  userId: string,
  data: UpdateReadingPageForm,
): Promise<{ success: true } | ActionErrorResult> {
  const existing = await getBookByIdForUser(userId, data.bookId);

  if (!existing) {
    return actionError("library.notFound");
  }

  const totalPages = data.totalPages ?? existing.totalPages;
  const page = clampPage(data.page, totalPages);

  await getDb()
    .update(libraryBook)
    .set({ currentPage: page, totalPages, lastReadAt: new Date() })
    .where(
      and(eq(libraryBook.id, data.bookId), eq(libraryBook.userId, userId)),
    );

  return { success: true };
}

// Persists the reader zoom for one device class without touching the other, so
// a phone and a laptop keep independent zooms for the same book.
export async function updateBookZoomForUser(
  userId: string,
  data: UpdateBookZoomForm,
): Promise<{ success: true } | ActionErrorResult> {
  const existing = await getBookByIdForUser(userId, data.bookId);

  if (!existing) {
    return actionError("library.notFound");
  }

  const column =
    data.device === "mobile"
      ? { zoomMobile: data.zoom }
      : { zoomDesktop: data.zoom };

  await getDb()
    .update(libraryBook)
    .set(column)
    .where(
      and(eq(libraryBook.id, data.bookId), eq(libraryBook.userId, userId)),
    );

  return { success: true };
}

export async function updateBookForUser(
  userId: string,
  data: UpdateBookForm,
): Promise<{ success: true } | ActionErrorResult> {
  const existing = await getBookByIdForUser(userId, data.bookId);

  if (!existing) {
    return actionError("library.notFound");
  }

  await getDb()
    .update(libraryBook)
    .set({ title: data.title, author: data.author ?? null })
    .where(
      and(eq(libraryBook.id, data.bookId), eq(libraryBook.userId, userId)),
    );

  return { success: true };
}

export async function deleteBookForUser(
  userId: string,
  data: DeleteBookForm,
): Promise<{ success: true } | ActionErrorResult> {
  const existing = await getBookByIdForUser(userId, data.bookId);

  if (!existing) {
    return actionError("library.notFound");
  }

  const deletedFile = await deleteBookBlob(existing.blobPathname);

  if (!deletedFile) {
    return actionError("library.deleteFailed");
  }

  await getDb()
    .delete(libraryBook)
    .where(
      and(eq(libraryBook.id, data.bookId), eq(libraryBook.userId, userId)),
    );

  return { success: true };
}

/**
 * Reparents a book to another subject (sidebar tree drag-and-drop). Mirrors the
 * note/mindmap move so books behave like any other subject document. Returns
 * both subjects so the caller can revalidate each side.
 *
 * @example moveBookForUser(userId, { id, subjectId: targetSubjectId })
 */
export async function moveBookForUser(
  userId: string,
  data: MoveDocumentMutationInput,
): Promise<MoveDocumentResult> {
  const existing = await getBookByIdForUser(userId, data.id);

  if (!existing) {
    return actionError("library.notFound");
  }

  if (!(await getSubjectByIdForUser(userId, data.subjectId))) {
    return actionError("library.invalidData");
  }

  await getDb()
    .update(libraryBook)
    .set({ subjectId: data.subjectId })
    .where(and(eq(libraryBook.id, data.id), eq(libraryBook.userId, userId)));

  return {
    success: true,
    subjectId: data.subjectId,
    previousSubjectId: existing.subjectId ?? data.subjectId,
  };
}
