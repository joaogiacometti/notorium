import "server-only";

import { getDb } from "@/db/index";
import { flashcard, mindmap, note } from "@/db/schema";
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
    })
    .from(flashcard);

  const pathnames: string[] = [];
  for (const row of rows) {
    pathnames.push(
      ...getInternalAttachmentPathnames(`${row.front}${row.back}`),
    );
  }

  return pathnames;
}

async function collectMindmapPathnames(): Promise<string[]> {
  const rows = await getDb().select({ data: mindmap.data }).from(mindmap);

  return rows.flatMap((row) => getMindmapImagePathnames(row.data));
}

/**
 * Collect every blob pathname referenced by live database rows across all
 * features that store media (notes, flashcards, mindmaps). The
 * orphan GC sweep treats any stored blob absent from this set as unreferenced.
 * Returning a complete set is safety-critical: a missing reference type would
 * cause the sweep to delete in-use blobs.
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
  ]);

  return new Set(groups.flat());
}
