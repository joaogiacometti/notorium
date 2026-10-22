import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/index";
import { mindmap, note } from "@/db/schema";
import type {
  FlashcardSource,
  FlashcardSourceLink,
} from "@/features/flashcards/source-contract";

interface SourceReferences {
  sourceNoteId?: string | null;
  sourceMindmapId?: string | null;
}

/** Validate a source against ownership without loading its content.
 * @example await readOwnedFlashcardSource(userId, { kind: "note", id: "n1" });
 */
export async function readOwnedFlashcardSource(
  userId: string,
  source: FlashcardSource,
): Promise<FlashcardSourceLink | null> {
  const [owned] = await readSourceDocuments(userId, source.kind, [source.id]);
  return owned ?? null;
}

/** Resolve current titles and locations in batches; missing sources have no link.
 * @example await attachFlashcardSources(userId, cards);
 */
export async function attachFlashcardSources<T extends SourceReferences>(
  userId: string,
  cards: T[],
): Promise<Array<T & { source: FlashcardSourceLink | null }>> {
  const [noteMap, mindmapMap] = await Promise.all([
    readReferencedSources(userId, "note", cards),
    readReferencedSources(userId, "mindmap", cards),
  ]);
  return cards.map((card) => ({
    ...card,
    source:
      noteMap.get(card.sourceNoteId ?? "") ??
      mindmapMap.get(card.sourceMindmapId ?? "") ??
      null,
  }));
}

async function readReferencedSources(
  userId: string,
  kind: FlashcardSource["kind"],
  cards: SourceReferences[],
): Promise<Map<string, FlashcardSourceLink>> {
  const key = kind === "note" ? "sourceNoteId" : "sourceMindmapId";
  const ids = cards.flatMap((card) => (card[key] ? [card[key]] : []));
  const sources = await readSourceDocuments(userId, kind, ids);
  return new Map(sources.map((source) => [source.id, source]));
}

async function readSourceDocuments(
  userId: string,
  kind: FlashcardSource["kind"],
  ids: string[],
): Promise<FlashcardSourceLink[]> {
  if (!ids.length) return [];
  const table = kind === "note" ? note : mindmap;
  const rows = await getDb()
    .select({ id: table.id, title: table.title, subjectId: table.subjectId })
    .from(table)
    .where(and(eq(table.userId, userId), inArray(table.id, [...new Set(ids)])));
  return rows.map((row) => ({ ...row, kind }));
}
