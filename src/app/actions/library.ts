"use server";

import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { revalidatePath } from "next/cache";
import type { CreateBookResult } from "@/features/library/mutations";
import {
  bulkDeleteBooksForUser,
  createBookForUser,
  deleteBookForUser,
  updateBookForUser,
  updateReadingPageForUser,
} from "@/features/library/mutations";
import {
  countBooksForUser,
  getBookByIdForUser,
  getBooksForUser,
} from "@/features/library/queries";
import { buildBookBlobPath } from "@/features/library/utils";
import {
  type BulkDeleteBooksForm,
  bulkDeleteBooksSchema,
  type CreateBookForm,
  createBookSchema,
  type DeleteBookForm,
  deleteBookSchema,
  type GenerateTokenForm,
  generateTokenSchema,
  type UpdateBookForm,
  type UpdateReadingPageForm,
  updateBookSchema,
  updateReadingPageSchema,
} from "@/features/library/validation";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { LIMITS } from "@/lib/config/limits";
import { isMediaStorageConfigured } from "@/lib/media-storage/provider";
import { runValidatedUserAction } from "@/lib/server/action-runner";
import type {
  BulkLibraryMutationResult,
  LibraryBookEntity,
  MutationResult,
} from "@/lib/server/api-contracts";

export async function getBooks(): Promise<LibraryBookEntity[]> {
  const userId = await getAuthenticatedUserId();
  return getBooksForUser(userId);
}

export async function getBook(id: string): Promise<LibraryBookEntity | null> {
  const userId = await getAuthenticatedUserId();
  return getBookByIdForUser(userId, id);
}

export type GenerateTokenResult =
  | { success: true; token: string; pathname: string }
  | { success: false; error: string };

export async function generateLibraryUploadToken(
  data: GenerateTokenForm,
): Promise<GenerateTokenResult> {
  const userId = await getAuthenticatedUserId();

  const validated = generateTokenSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: "library.invalidData" };
  }

  if ((await countBooksForUser(userId)) >= LIMITS.maxBooksPerUser) {
    return { success: false, error: "limits.bookLimit" };
  }

  if (!isMediaStorageConfigured()) {
    return { success: false, error: "library.notConfigured" };
  }

  const pathname = buildBookBlobPath(userId, validated.data.fileName);

  const token = await generateClientTokenFromReadWriteToken({
    pathname,
    maximumSizeInBytes: LIMITS.libraryBookMaxBytes,
    allowedContentTypes: ["application/pdf"],
  });

  return { success: true, token, pathname };
}

export async function uploadBook(
  data: CreateBookForm,
): Promise<CreateBookResult> {
  const result = await runValidatedUserAction(
    createBookSchema,
    data,
    "library.invalidData",
    async (userId, parsedData) => createBookForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/library");
  }

  return result;
}

/**
 * Persists the page the reader is currently on. Intentionally does not call
 * `revalidatePath`: it fires repeatedly as the user scrolls, the client already
 * holds the live page, and the library list re-reads on next navigation.
 */
export async function updateReadingPage(
  data: UpdateReadingPageForm,
): Promise<MutationResult> {
  return runValidatedUserAction(
    updateReadingPageSchema,
    data,
    "library.invalidData",
    async (userId, parsedData) => updateReadingPageForUser(userId, parsedData),
  );
}

export async function updateBook(
  data: UpdateBookForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    updateBookSchema,
    data,
    "library.invalidData",
    async (userId, parsedData) => updateBookForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/library");
    revalidatePath(`/library/${data.bookId}`);
  }

  return result;
}

export async function deleteBook(
  data: DeleteBookForm,
): Promise<MutationResult> {
  const result = await runValidatedUserAction(
    deleteBookSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => deleteBookForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/library");
  }

  return result;
}

export async function bulkDeleteBooks(
  data: BulkDeleteBooksForm,
): Promise<BulkLibraryMutationResult> {
  const result = await runValidatedUserAction(
    bulkDeleteBooksSchema,
    data,
    "ServerErrors.common.invalidRequest",
    async (userId, parsedData) => bulkDeleteBooksForUser(userId, parsedData),
  );

  if (result.success) {
    revalidatePath("/library");
  }

  return result;
}
