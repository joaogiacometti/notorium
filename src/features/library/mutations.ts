import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { libraryBook } from "@/db/schema";
import { isSupportedLibraryBookMime } from "@/features/library/constants";
import {
  countBooksForUser,
  getBookByIdForUser,
  getBookFileRecordsForUser,
} from "@/features/library/queries";
import { validateBookBlobPath } from "@/features/library/utils";
import type {
  BulkDeleteBooksForm,
  CreateBookForm,
  DeleteBookForm,
  UpdateBookForm,
  UpdateReadingPageForm,
} from "@/features/library/validation";
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

export async function bulkDeleteBooksForUser(
  userId: string,
  data: BulkDeleteBooksForm,
): Promise<{ success: true; ids: string[] } | ActionErrorResult> {
  const records = await getBookFileRecordsForUser(userId, data.ids);

  if (records.length !== data.ids.length) {
    return actionError("library.notFound");
  }

  const deletedFiles = await deleteBookBlobs(
    records.map((record) => record.blobPathname),
  );

  if (!deletedFiles) {
    return actionError("library.deleteFailed");
  }

  await getDb()
    .delete(libraryBook)
    .where(
      and(inArray(libraryBook.id, data.ids), eq(libraryBook.userId, userId)),
    );

  return { success: true, ids: data.ids };
}
