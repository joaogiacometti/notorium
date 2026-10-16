import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, mindmap, note } from "@/db/schema";
import { getOwnedAttachmentPathnames } from "@/features/attachments/pathname";
import { getMindmapImagePathnames } from "@/features/mindmaps/utils";
import { getDescendantSubjectIds } from "@/features/subjects/queries";
import { getInternalAttachmentPathnames } from "@/lib/editor/rich-text";
import { getMediaStorageProvider } from "@/lib/media-storage/provider";

export async function cleanupAttachmentPathnames(
  userId: string,
  pathnames: string[],
): Promise<void> {
  const ownedPathnames = Array.from(
    new Set(getOwnedAttachmentPathnames(pathnames, userId)),
  );

  if (ownedPathnames.length === 0) {
    return;
  }

  const provider = await getMediaStorageProvider();

  if (!provider) {
    return;
  }

  try {
    await provider.deleteImages({ pathnames: ownedPathnames });
  } catch {}
}

/**
 * Collects every attachment pathname owned by a subject subtree across notes,
 * mindmaps, and flashcards so cascade deletion can clean storage
 * immediately instead of waiting for the orphan sweep.
 *
 * @example
 * const pathnames = await getSubjectAttachmentPathnamesForUser(userId, subjectId);
 */
export async function getSubjectAttachmentPathnamesForUser(
  userId: string,
  subjectId: string,
): Promise<string[]> {
  const descendantSubjectIds = await getDescendantSubjectIds(userId, subjectId);
  if (descendantSubjectIds.length === 0) {
    return [];
  }

  const [notes, mindmaps, flashcards] = await Promise.all([
    getDb()
      .select({ content: note.content })
      .from(note)
      .where(
        and(
          eq(note.userId, userId),
          inArray(note.subjectId, descendantSubjectIds),
        ),
      ),
    getDb()
      .select({ data: mindmap.data })
      .from(mindmap)
      .where(
        and(
          eq(mindmap.userId, userId),
          inArray(mindmap.subjectId, descendantSubjectIds),
        ),
      ),
    getDb()
      .select({ front: flashcard.front, back: flashcard.back })
      .from(flashcard)
      .where(
        and(
          eq(flashcard.userId, userId),
          inArray(flashcard.subjectId, descendantSubjectIds),
        ),
      ),
  ]);

  return Array.from(
    new Set([
      ...notes.flatMap((item) =>
        getInternalAttachmentPathnames(item.content ?? ""),
      ),
      ...mindmaps.flatMap((item) => getMindmapImagePathnames(item.data)),
      ...flashcards.flatMap((item) =>
        getInternalAttachmentPathnames(`${item.front}${item.back}`),
      ),
    ]),
  );
}
