import { and, count, desc, eq, inArray, ne, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { note, subject } from "@/db/schema";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import { extractNoteLinkIds, getNoteLinkMarker } from "@/lib/editor/note-links";
import type {
  NoteConnections,
  NoteEntity,
  NoteLinkTarget,
} from "@/lib/server/api-contracts";

export async function getNotesBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<NoteEntity[]> {
  return getDb()
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.subjectId, subjectId),
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .orderBy(desc(note.updatedAt))
    .then((rows) => rows.map((row) => row.note));
}

/**
 * Most recently updated notes across all of a user's active subjects, used by
 * the home dashboard's "recent documents" card. Selects only list-preview
 * columns (never the `content` blob).
 *
 * @example
 * const notes = await getRecentNotesForUser(userId, 5);
 */
export async function getRecentNotesForUser(
  userId: string,
  limit: number,
): Promise<Pick<NoteEntity, "id" | "title" | "updatedAt" | "subjectId">[]> {
  return getDb()
    .select({
      id: note.id,
      title: note.title,
      updatedAt: note.updatedAt,
      subjectId: note.subjectId,
    })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(eq(note.userId, userId), ...getOwnedActiveSubjectFilters(userId)),
    )
    .orderBy(desc(note.updatedAt))
    .limit(limit);
}

export async function getNoteByIdForUser(
  userId: string,
  noteId: string,
): Promise<NoteEntity | null> {
  const results = await getDb()
    .select({ note })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.id, noteId),
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    )
    .limit(1);

  return results[0]?.note ?? null;
}

/**
 * Links in and out of an owned note, or `null` when it doesn't exist. Backlinks
 * are read from stored HTML, so they can't drift from note content. A linked id
 * the user can't read is reported as missing, whether deleted or never theirs.
 *
 * @example
 * const connections = await getNoteConnectionsForUser(userId, noteId);
 */
export async function getNoteConnectionsForUser(
  userId: string,
  noteId: string,
): Promise<NoteConnections | null> {
  const current = await getNoteByIdForUser(userId, noteId);
  if (!current) return null;

  const linkedIds = extractNoteLinkIds(current.content ?? "");
  const [backlinks, outgoing] = await Promise.all([
    selectNoteLinkTargets(
      userId,
      and(
        ne(note.id, noteId),
        sql`strpos(${note.content}, ${getNoteLinkMarker(noteId)}) > 0`,
      ),
    ),
    linkedIds.length > 0
      ? selectNoteLinkTargets(userId, inArray(note.id, linkedIds))
      : [],
  ]);
  const foundIds = new Set(outgoing.map((target) => target.id));

  return {
    backlinks,
    outgoing,
    missingIds: linkedIds.filter((id) => !foundIds.has(id)),
  };
}

function selectNoteLinkTargets(
  userId: string,
  condition: SQL | undefined,
): Promise<NoteLinkTarget[]> {
  return getDb()
    .select({ id: note.id, title: note.title, subjectId: note.subjectId })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
        condition,
      ),
    )
    .orderBy(desc(note.updatedAt));
}

export async function countNotesBySubjectForUser(
  userId: string,
  subjectId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.subjectId, subjectId),
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
      ),
    );

  return result[0]?.total ?? 0;
}
