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
  const ownedPathnames = getOwnedAttachmentPathnames(pathnames, userId);

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
 * Collects every attachment pathname owned by a subject: notes, mindmaps,
 * assessment attachments on the subject itself, plus flashcard images across
 * the subject and its descendants (cards now live on subjects, not decks).
 *
 * @example
 * const pathnames = await getSubjectAttachmentPathnamesForUser(userId, subjectId);
 */
export async function getSubjectAttachmentPathnamesForUser(
  userId: string,
  subjectId: string,
): Promise<string[]> {
  const descendantSubjectIds = await getDescendantSubjectIds(userId, subjectId);
  const [notes, mindmaps, attachments, flashcards] = await Promise.all([
    getDb()
      .select({ content: note.content })
      .from(note)
      .where(and(eq(note.userId, userId), eq(note.subjectId, subjectId))),
    getDb()
      .select({ data: mindmap.data })
      .from(mindmap)
      .where(and(eq(mindmap.userId, userId), eq(mindmap.subjectId, subjectId))),
    getDb()
      .select({ blobPathname: assessmentAttachment.blobPathname })
      .from(assessmentAttachment)
      .innerJoin(
        assessment,
        eq(assessmentAttachment.assessmentId, assessment.id),
      )
      .where(
        and(eq(assessment.userId, userId), eq(assessment.subjectId, subjectId)),
      ),
    descendantSubjectIds.length > 0
      ? getDb()
          .select({ front: flashcard.front, back: flashcard.back })
          .from(flashcard)
          .where(
            and(
              eq(flashcard.userId, userId),
              inArray(flashcard.subjectId, descendantSubjectIds),
            ),
          )
      : Promise.resolve([]),
  ]);

  return [
    ...notes.flatMap((item) =>
      getInternalAttachmentPathnames(item.content ?? ""),
    ),
    ...mindmaps.flatMap((item) => getMindmapImagePathnames(item.data)),
    ...attachments.map((item) => item.blobPathname),
    ...flashcards.flatMap((item) =>
      getInternalAttachmentPathnames(`${item.front}${item.back}`),
    ),
  ];
}
