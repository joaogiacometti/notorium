import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { libraryBook } from "@/db/schema";
import type { LibraryBookEntity } from "@/lib/server/api-contracts";

export interface LibraryBookFileRecord {
  id: string;
  blobPathname: string;
}

export async function getBooksForUser(
  userId: string,
): Promise<LibraryBookEntity[]> {
  return getDb()
    .select()
    .from(libraryBook)
    .where(eq(libraryBook.userId, userId))
    .orderBy(desc(libraryBook.updatedAt));
}

/**
 * Loads the user's most recently active books for the home dashboard, ordered
 * by `updatedAt` so reading-position updates surface the books in progress.
 *
 * @example
 * await getRecentBooksForUser(userId, 6); // [{ id, title, ... }]
 */
export async function getRecentBooksForUser(
  userId: string,
  limit: number,
): Promise<LibraryBookEntity[]> {
  return getDb()
    .select()
    .from(libraryBook)
    .where(eq(libraryBook.userId, userId))
    .orderBy(desc(libraryBook.updatedAt))
    .limit(limit);
}

/**
 * Loads every book the user filed under one subject, newest activity first.
 * Powers the per-subject books view that replaced the standalone /library.
 *
 * @example
 * await getBooksBySubjectForUser(userId, subjectId); // [{ id, title, ... }]
 */
export async function getBooksBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<LibraryBookEntity[]> {
  return getDb()
    .select()
    .from(libraryBook)
    .where(
      and(eq(libraryBook.userId, userId), eq(libraryBook.subjectId, subjectId)),
    )
    .orderBy(desc(libraryBook.updatedAt));
}

export async function getBookByIdForUser(
  userId: string,
  bookId: string,
): Promise<LibraryBookEntity | null> {
  const results = await getDb()
    .select()
    .from(libraryBook)
    .where(and(eq(libraryBook.id, bookId), eq(libraryBook.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

/**
 * Loads the id and stored file pathname for the given books owned by the user.
 * Used by bulk delete to remove blobs before the rows. Skips books the user
 * does not own, so the caller can detect a mismatch by comparing counts.
 *
 * @example
 * await getBookFileRecordsForUser(userId, ["a", "b"]); // [{ id, blobPathname }]
 */
export async function getBookFileRecordsForUser(
  userId: string,
  bookIds: string[],
): Promise<LibraryBookFileRecord[]> {
  if (bookIds.length === 0) {
    return [];
  }

  return getDb()
    .select({ id: libraryBook.id, blobPathname: libraryBook.blobPathname })
    .from(libraryBook)
    .where(
      and(inArray(libraryBook.id, bookIds), eq(libraryBook.userId, userId)),
    );
}

export async function countBooksForUser(userId: string): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(libraryBook)
    .where(eq(libraryBook.userId, userId));

  return result[0]?.total ?? 0;
}
