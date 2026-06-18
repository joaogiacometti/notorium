import "server-only";

import { getDb } from "@/db/index";
import {
  assessmentAttachment,
  flashcard,
  libraryBook,
  mindmap,
  note,
} from "@/db/schema";
import { getMindmapImagePathnames } from "@/features/mindmaps/utils";
import { getInternalAttachmentPathnames } from "@/lib/editor/rich-text";

async function collectNotePathnames(): Promise<string[]> {
  const rows = await getDb().select({ content: note.content }).from(note);

  return rows.flatMap((row) =>
    getInternalAttachmentPathnames(row.content ?? ""),
  );
}

async function collectFlashcardPathnames(): Promise<string[]> {
  const rows = await getDb()
    .select({
      front: flashcard.front,
      back: flashcard.back,
      occlusionImagePathname: flashcard.occlusionImagePathname,
    })
    .from(flashcard);

  const pathnames: string[] = [];
  for (const row of rows) {
    pathnames.push(
      ...getInternalAttachmentPathnames(`${row.front}${row.back}`),
    );
    if (row.occlusionImagePathname) {
      pathnames.push(row.occlusionImagePathname);
    }
  }

  return pathnames;
}

async function collectMindmapPathnames(): Promise<string[]> {
  const rows = await getDb().select({ data: mindmap.data }).from(mindmap);

  return rows.flatMap((row) => getMindmapImagePathnames(row.data));
}

async function collectAssessmentPathnames(): Promise<string[]> {
  const rows = await getDb()
    .select({ blobPathname: assessmentAttachment.blobPathname })
    .from(assessmentAttachment);

  return rows.map((row) => row.blobPathname);
}

async function collectLibraryPathnames(): Promise<string[]> {
  const rows = await getDb()
    .select({ blobPathname: libraryBook.blobPathname })
    .from(libraryBook);

  return rows.map((row) => row.blobPathname);
}

/**
 * Collect every blob pathname referenced by live database rows across all
 * features that store media (notes, flashcards, mindmaps, assessments,
 * library). The orphan GC sweep treats any stored blob absent from this set as
 * unreferenced. Returning a complete set is safety-critical: a missing
 * reference type would cause the sweep to delete in-use blobs.
 *
 * @example
 * const referenced = await collectAllReferencedPathnames();
 * const isOrphan = !referenced.has(blob.pathname);
 */
export async function collectAllReferencedPathnames(): Promise<Set<string>> {
  const groups = await Promise.all([
    collectNotePathnames(),
    collectFlashcardPathnames(),
    collectMindmapPathnames(),
    collectAssessmentPathnames(),
    collectLibraryPathnames(),
  ]);

  return new Set(groups.flat());
}
