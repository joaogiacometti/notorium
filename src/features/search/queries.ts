import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, folder, note, pdfDocument } from "@/db/schema";
import { getAllFoldersWithPathsForUser } from "@/features/folders/queries";
import { foldedContains } from "@/features/search/match-sql";
import { LIMITS } from "@/lib/config/limits";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type { SearchData } from "@/lib/server/api-contracts";

export async function getSearchDataForUser(
  userId: string,
  searchQuery: string,
): Promise<SearchData> {
  const searchPattern = buildContainsSearchPattern(searchQuery);
  const folderPathMap = await getAllFoldersWithPathsForUser(userId).then(
    (folders) =>
      new Map(
        folders.map((currentFolder) => [currentFolder.id, currentFolder.path]),
      ),
  );

  const [allNotes, allPdfs, allFlashcards] = await Promise.all([
    getDb()
      .select({
        id: note.id,
        title: note.title,
        content: note.content,
        folderId: note.folderId,
        folderName: folder.name,
      })
      .from(note)
      .innerJoin(folder, eq(note.folderId, folder.id))
      .where(
        and(
          eq(note.userId, userId),
          eq(folder.userId, userId),
          or(
            foldedContains(note.title, searchPattern),
            foldedContains(note.contentText, searchPattern),
            foldedContains(folder.name, searchPattern),
          ),
        ),
      )
      .orderBy(desc(note.updatedAt))
      .limit(LIMITS.searchResultsLimit),
    getDb()
      .select({
        id: pdfDocument.id,
        title: pdfDocument.title,
        folderId: pdfDocument.folderId,
        folderName: folder.name,
      })
      .from(pdfDocument)
      .innerJoin(folder, eq(pdfDocument.folderId, folder.id))
      .where(
        and(
          eq(pdfDocument.userId, userId),
          eq(folder.userId, userId),
          or(
            foldedContains(pdfDocument.title, searchPattern),
            foldedContains(folder.name, searchPattern),
          ),
        ),
      )
      .orderBy(desc(pdfDocument.updatedAt))
      .limit(LIMITS.searchResultsLimit),
    getDb()
      .select({
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        folderId: flashcard.folderId,
        folderName: folder.name,
      })
      .from(flashcard)
      .innerJoin(folder, eq(flashcard.folderId, folder.id))
      .where(
        and(
          eq(flashcard.userId, userId),
          or(
            foldedContains(flashcard.frontText, searchPattern),
            foldedContains(flashcard.backText, searchPattern),
          ),
        ),
      )
      .orderBy(desc(flashcard.updatedAt))
      .limit(LIMITS.searchResultsLimit),
  ]);

  return {
    notes: allNotes,
    pdfs: allPdfs,
    flashcards: allFlashcards.map((flashcard) => ({
      ...flashcard,
      folderPath:
        (flashcard.folderId
          ? folderPathMap.get(flashcard.folderId)
          : undefined) ?? flashcard.folderName,
    })),
  };
}
