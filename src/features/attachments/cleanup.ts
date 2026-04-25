import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { assessment, assessmentAttachment, flashcard, note } from "@/db/schema";
import { getOwnedAttachmentPathnames } from "@/features/attachments/pathname";
import { getDescendantDeckIds } from "@/features/decks/queries";
import { getInternalAttachmentPathnames } from "@/lib/editor/rich-text";
import {
  getMediaStorageProvider,
  type MediaStorageProvider,
} from "@/lib/media-storage/provider";

const ATTACHMENT_ACCOUNT_CONTEXTS = ["notes", "flashcards", "assessments"];

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

async function listProviderPathnames(
  provider: MediaStorageProvider,
  prefix: string,
): Promise<string[]> {
  if (
    "listFilePathnames" in provider &&
    typeof provider.listFilePathnames === "function"
  ) {
    return (await provider.listFilePathnames({ prefix })) ?? [];
  }

  return (await provider.listImagePathnames({ prefix })) ?? [];
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

export async function listAccountAttachmentPathnames(
  provider: MediaStorageProvider,
  userId: string,
): Promise<string[]> {
  const pathnames = await Promise.all(
    ATTACHMENT_ACCOUNT_CONTEXTS.map((context) =>
      listProviderPathnames(provider, `notorium/${context}/${userId}/`),
    ),
  );

  return pathnames.flat();
}

export async function getSubjectAttachmentPathnamesForUser(
  userId: string,
  subjectId: string,
): Promise<string[]> {
  const [notes, attachments] = await Promise.all([
    getDb()
      .select({ content: note.content })
      .from(note)
      .where(and(eq(note.userId, userId), eq(note.subjectId, subjectId))),
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
  ]);

  return [
    ...notes.flatMap((item) =>
      getInternalAttachmentPathnames(item.content ?? ""),
    ),
    ...attachments.map((item) => item.blobPathname),
  ];
}

export async function getDeckAttachmentPathnamesForUser(
  userId: string,
  deckId: string,
): Promise<string[]> {
  const deckIds = await getDescendantDeckIds(userId, deckId);

  if (deckIds.length === 0) {
    return [];
  }

  const flashcards = await getDb()
    .select({ front: flashcard.front, back: flashcard.back })
    .from(flashcard)
    .where(
      and(eq(flashcard.userId, userId), inArray(flashcard.deckId, deckIds)),
    );

  return flashcards.flatMap((item) =>
    getInternalAttachmentPathnames(`${item.front}${item.back}`),
  );
}
