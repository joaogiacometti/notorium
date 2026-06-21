/**
 * One-shot data migration: repoint library books onto subjects.
 *
 * Books are moving from the standalone `/library` into the shared `subject`
 * tree (see schema Migration A/B). For every user with unassigned books this
 * finds-or-creates a single root `general` subject named "Library" and points
 * every `subjectId IS NULL` book at it.
 *
 * Run AFTER Migration A (adds nullable libraryBook.subjectId) and BEFORE
 * Migration B (makes it notNull):
 *
 *   bun --env-file=.env run scripts/backfill-books-to-subjects.ts
 *
 * Safe to re-run: the whole job runs in one transaction and exits early when
 * no book still needs a subject, so a clean DB is a no-op.
 *
 * Name collisions: the `(userId, parent, name)` unique index is shared across
 * subject kinds, so a generated root "Library" can collide with an existing
 * subject of the same name. Colliding names get a " (books)" suffix (then
 * " (books 2)", ...) and the rename is logged.
 */
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/index";
import { libraryBook, subject } from "@/db/schema";

const DEFAULT_BOOKS_SUBJECT_NAME = "Library";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Returns a collision-free root subject name for `userId`, suffixing
 * " (books)" when the desired name already exists at the root level.
 */
async function resolveRootName(tx: Tx, userId: string): Promise<string> {
  const existing = await tx
    .select({ name: subject.name })
    .from(subject)
    .where(and(eq(subject.userId, userId), isNull(subject.parentSubjectId)));
  const taken = new Set(existing.map((row) => row.name));
  if (!taken.has(DEFAULT_BOOKS_SUBJECT_NAME)) {
    return DEFAULT_BOOKS_SUBJECT_NAME;
  }
  for (let i = 1; ; i += 1) {
    const candidate =
      i === 1
        ? `${DEFAULT_BOOKS_SUBJECT_NAME} (books)`
        : `${DEFAULT_BOOKS_SUBJECT_NAME} (books ${i})`;
    if (!taken.has(candidate)) return candidate;
  }
}

async function backfillUser(tx: Tx, userId: string): Promise<number> {
  const name = await resolveRootName(tx, userId);
  if (name !== DEFAULT_BOOKS_SUBJECT_NAME) {
    console.info(
      JSON.stringify({
        event: "books_subject_rename",
        userId,
        from: DEFAULT_BOOKS_SUBJECT_NAME,
        to: name,
      }),
    );
  }
  const [created] = await tx
    .insert(subject)
    .values({ name, kind: "general", parentSubjectId: null, userId })
    .returning({ id: subject.id });

  const updated = await tx
    .update(libraryBook)
    .set({ subjectId: created.id })
    .where(and(eq(libraryBook.userId, userId), isNull(libraryBook.subjectId)))
    .returning({ id: libraryBook.id });
  return updated.length;
}

async function main(): Promise<void> {
  const db = getDb();
  const pending = await db
    .select({ id: libraryBook.id })
    .from(libraryBook)
    .where(isNull(libraryBook.subjectId))
    .limit(1);
  if (pending.length === 0) {
    console.info(
      JSON.stringify({ event: "backfill_skip", reason: "no_pending" }),
    );
    return;
  }

  await db.transaction(async (tx) => {
    const userRows = await tx
      .selectDistinct({ userId: libraryBook.userId })
      .from(libraryBook)
      .where(isNull(libraryBook.subjectId));
    let total = 0;
    for (const { userId } of userRows) {
      total += await backfillUser(tx, userId);
    }
    console.info(
      JSON.stringify({
        event: "backfill_done",
        users: userRows.length,
        repointed: total,
      }),
    );
  });
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(
      JSON.stringify({ event: "backfill_failed", error: String(error) }),
    );
    process.exit(1);
  },
);
