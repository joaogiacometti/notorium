import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import {
  assessment,
  assessmentAttachment,
  flashcard,
  mindmap,
  note,
} from "@/db/schema";
import { getOwnedAttachmentPathnames } from "@/features/attachments/pathname";
import { getMindmapImagePathnames } from "@/features/mindmaps/utils";
import { getDescendantSubjectIds } from "@/features/subjects/queries";
import { getInternalAttachmentPathnames } from "@/lib/editor/rich-text";
import {
  getMediaStorageProvider,
  type MediaStorageProvider,
} from "@/lib/media-storage/provider";

async function deleteProviderPathnames(
  provider: MediaStorageProvider,
  pathnames: string[],
) {
  if ("deleteFiles" in provider && typeof provider.deleteFiles === "function") {
    await provider.deleteFiles({ pathnames });
    return;
  }

  await provider.deleteImages({ pathnames });
}

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
    await deleteProviderPathnames(provider, ownedPathnames);
  } catch {}
}

/**
 * Collects every attachment pathname owned by a subject subtree across notes,
 * mindmaps, assessments, and flashcards so cascade deletion can clean storage
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

  const [notes, mindmaps, attachments, flashcards] = await Promise.all([
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
      .select({ blobPathname: assessmentAttachment.blobPathname })
      .from(assessmentAttachment)
      .innerJoin(
        assessment,
        eq(assessmentAttachment.assessmentId, assessment.id),
      )
      .where(
        and(
          eq(assessment.userId, userId),
          inArray(assessment.subjectId, descendantSubjectIds),
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
      ...attachments.map((item) => item.blobPathname),
      ...flashcards.flatMap((item) =>
        getInternalAttachmentPathnames(`${item.front}${item.back}`),
      ),
    ]),
  );
}
