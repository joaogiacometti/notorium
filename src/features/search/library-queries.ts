import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, mindmap, note, subject } from "@/db/schema";
import {
  LIBRARY_HIT_KINDS,
  type LibraryHit,
  type LibrarySearchInput,
  type LibrarySearchOutput,
} from "@/features/assistant/library-search-contract";
import { findMindmapNodeLabelMatch } from "@/features/mindmaps/utils";
import {
  buildLibraryHit,
  type LibraryHitSource,
} from "@/features/search/library-hits";
import { buildTermSearch } from "@/features/search/match-sql";
import { getSubjectPathMapForUser } from "@/features/subjects/queries";
import { getOwnedActiveSubjectFilters } from "@/features/subjects/query-helpers";
import { LIMITS } from "@/lib/config/limits";
import { richTextToPlainText } from "@/lib/editor/rich-text";

type LibraryKind = LibraryHit["kind"];

const LIBRARY_HIT_FINDERS: Record<
  LibraryKind,
  (userId: string, terms: string[]) => Promise<LibraryHitSource[]>
> = {
  note: findNoteHitSources,
  flashcard: findFlashcardHitSources,
  mindmap: findMindmapHitSources,
};

/**
 * The study assistant's library lookup: a few best matches per kind for any
 * of `terms`, ignoring case and accents, with typo tolerance on titles and
 * fronts. Returns short excerpts, never whole documents, so the model can
 * answer "do I have anything on X?" without reading the library.
 *
 * @example
 * const { hits } = await searchLibraryForUser(userId, { terms: ["mitose", "mitosis"] });
 */
export async function searchLibraryForUser(
  userId: string,
  { terms, kinds }: LibrarySearchInput,
): Promise<LibrarySearchOutput> {
  const wanted = LIBRARY_HIT_KINDS.filter(
    (kind) => !kinds || kinds.includes(kind),
  );
  const [paths, ...sourcesByKind] = await Promise.all([
    getSubjectPathMapForUser(userId),
    ...wanted.map((kind) => LIBRARY_HIT_FINDERS[kind](userId, terms)),
  ]);

  return {
    hits: sourcesByKind
      .flat()
      .map((source) =>
        buildLibraryHit(source, terms, paths.get(source.subjectId) ?? ""),
      ),
  };
}

async function findNoteHitSources(
  userId: string,
  terms: string[],
): Promise<LibraryHitSource[]> {
  const search = buildTermSearch(
    terms,
    [note.title, note.content, subject.name],
    note.title,
    note.updatedAt,
  );
  const rows = await getDb()
    .select({
      id: note.id,
      subjectId: note.subjectId,
      title: note.title,
      content: note.content,
    })
    .from(note)
    .innerJoin(subject, eq(note.subjectId, subject.id))
    .where(
      and(
        eq(note.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
        search.where,
      ),
    )
    .orderBy(...search.orderBy)
    .limit(LIMITS.assistantLibraryHitsPerKind);

  return rows.map(({ content, ...row }) => ({
    ...row,
    kind: "note",
    body: richTextToPlainText(content ?? ""),
  }));
}

async function findFlashcardHitSources(
  userId: string,
  terms: string[],
): Promise<LibraryHitSource[]> {
  const search = buildTermSearch(
    terms,
    [flashcard.front, flashcard.back],
    flashcard.front,
    flashcard.updatedAt,
  );
  const rows = await getDb()
    .select({
      id: flashcard.id,
      subjectId: flashcard.subjectId,
      front: flashcard.front,
      back: flashcard.back,
    })
    .from(flashcard)
    .where(and(eq(flashcard.userId, userId), search.where))
    .orderBy(...search.orderBy)
    .limit(LIMITS.assistantLibraryHitsPerKind);

  return rows.map(({ front, back, ...row }) => ({
    ...row,
    kind: "flashcard",
    title: richTextToPlainText(front),
    body: richTextToPlainText(back),
  }));
}

async function findMindmapHitSources(
  userId: string,
  terms: string[],
): Promise<LibraryHitSource[]> {
  const search = buildTermSearch(
    terms,
    [mindmap.title, mindmap.data, subject.name],
    mindmap.title,
    mindmap.updatedAt,
  );
  const rows = await getDb()
    .select({
      id: mindmap.id,
      subjectId: mindmap.subjectId,
      title: mindmap.title,
      data: mindmap.data,
    })
    .from(mindmap)
    .innerJoin(subject, eq(mindmap.subjectId, subject.id))
    .where(
      and(
        eq(mindmap.userId, userId),
        ...getOwnedActiveSubjectFilters(userId),
        search.where,
      ),
    )
    .orderBy(...search.orderBy)
    .limit(LIMITS.assistantLibraryHitsPerKind);

  return rows.map(({ data, ...row }) => ({
    ...row,
    kind: "mindmap",
    body: findMindmapNodeLabelMatch(data, ...terms) ?? "",
  }));
}
