import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { note } from "@/db/schema";
import type {
  FlashcardSource,
  FlashcardSourceLink,
} from "@/features/flashcards/source-contract";

interface SourceReferences {
  sourceNoteId?: string | null;
}

/** Validate a source against ownership without loading its content.
 * @example await readOwnedFlashcardSource(userId, { kind: "note", id: "n1" });
 */
export async function readOwnedFlashcardSource(
  userId: string,
  source: FlashcardSource,
): Promise<FlashcardSourceLink | null> {
  const [owned] = await readSourceDocuments(userId, [source.id]);
  return owned ?? null;
}

/** Resolve current titles and locations in batches; missing sources have no link.
 * @example await attachFlashcardSources(userId, cards);
 */
export async function attachFlashcardSources<T extends SourceReferences>(
  userId: string,
  cards: T[],
): Promise<Array<T & { source: FlashcardSourceLink | null }>> {
  const noteMap = await readReferencedSources(userId, cards);
  return cards.map((card) => ({
    ...card,
    source: noteMap.get(card.sourceNoteId ?? "") ?? null,
  }));
}

async function readReferencedSources(
  userId: string,
  cards: SourceReferences[],
): Promise<Map<string, FlashcardSourceLink>> {
  const ids = cards.flatMap((card) =>
    card.sourceNoteId ? [card.sourceNoteId] : [],
  );
  const sources = await readSourceDocuments(userId, ids);
  return new Map(sources.map((source) => [source.id, source]));
}

async function readSourceDocuments(
  userId: string,
  ids: string[],
): Promise<FlashcardSourceLink[]> {
  if (!ids.length) return [];
  const rows = await getDb()
    .select({ id: note.id, title: note.title, subjectId: note.subjectId })
    .from(note)
    .where(and(eq(note.userId, userId), inArray(note.id, [...new Set(ids)])));
  return rows.map((row) => ({ ...row, kind: "note" }));
}
