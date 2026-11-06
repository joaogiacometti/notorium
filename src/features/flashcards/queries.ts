import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/index";
import { flashcard, folder } from "@/db/schema";
import { attachFlashcardSources } from "@/features/flashcards/source-queries";
import { buildStrugglingFlashcardFilter } from "@/features/flashcards/struggling-filter";
import type {
  FlashcardManageFilter,
  FlashcardsManageQueryInput,
} from "@/features/flashcards/validation";
import {
  getDescendantFolderIds,
  getFolderPathForUser,
  getFolderPathMapForUser,
} from "@/features/folders/queries";
import { foldedContains } from "@/features/search/match-sql";
import { documentText } from "@/lib/editor/document";
import { documentExcerpt } from "@/lib/editor/document-content";
import { buildContainsSearchPattern } from "@/lib/search/pattern";
import type {
  FlashcardContentItem,
  FlashcardDetailEntity,
  FlashcardEntity,
  FlashcardManagePage,
} from "@/lib/server/api-contracts";

async function resolveScopedFolderIds(
  userId: string,
  folderId?: string,
  folderIds?: string[],
): Promise<string[] | undefined> {
  if (folderIds && folderIds.length > 0) {
    return folderIds;
  }

  if (!folderId) {
    return undefined;
  }

  return getDescendantFolderIds(userId, folderId);
}

interface ManageFilterRule {
  condition: (userId: string) => SQL;
  /** Sort keys ahead of recency when the list is not ranked by a search. */
  leadingOrderBy: SQL[];
}

const manageFilterRules: Record<FlashcardManageFilter, ManageFilterRule> = {
  studyLater: {
    condition: () => isNotNull(flashcard.studyLaterAt),
    leadingOrderBy: [],
  },
  struggling: {
    condition: buildStrugglingFlashcardFilter,
    leadingOrderBy: [desc(flashcard.lapseCount)],
  },
};

export function getFlashcardsManageOrderBy(
  normalizedSearch: string,
  searchPattern: string,
  filter?: FlashcardManageFilter,
): SQL<unknown>[] {
  if (normalizedSearch.length === 0) {
    const leading = filter ? manageFilterRules[filter].leadingOrderBy : [];
    return [...leading, desc(flashcard.updatedAt)];
  }

  return [
    sql<number>`case
      when ${foldedContains(flashcard.frontText, searchPattern)} then 0
      when ${foldedContains(flashcard.backText, searchPattern)} then 1
      when ${foldedContains(folder.name, searchPattern)} then 2
      else 3
    end`,
    desc(flashcard.updatedAt),
  ];
}

async function buildManageFilters(
  userId: string,
  {
    folderId,
    folderIds,
    filter,
  }: Pick<FlashcardsManageQueryInput, "folderId" | "folderIds" | "filter">,
): Promise<SQL<unknown>[]> {
  const filters: SQL<unknown>[] = [eq(flashcard.userId, userId)];
  const scopedFolderIds = await resolveScopedFolderIds(
    userId,
    folderId,
    folderIds,
  );

  if (scopedFolderIds && scopedFolderIds.length > 0) {
    filters.push(inArray(flashcard.folderId, scopedFolderIds));
  }

  if (filter) {
    filters.push(manageFilterRules[filter].condition(userId));
  }

  return filters;
}

export async function getFlashcardsManagePageForUser(
  userId: string,
  {
    pageIndex,
    pageSize,
    folderId,
    folderIds,
    search,
    filter,
  }: FlashcardsManageQueryInput,
): Promise<FlashcardManagePage> {
  const normalizedSearch = search?.trim() ?? "";
  const searchPattern = buildContainsSearchPattern(normalizedSearch);
  const offset = pageIndex * pageSize;
  const filters = await buildManageFilters(userId, {
    folderId,
    folderIds,
    filter,
  });

  const totalFilters =
    normalizedSearch.length > 0
      ? [
          ...filters,
          or(
            foldedContains(flashcard.frontText, searchPattern),
            foldedContains(flashcard.backText, searchPattern),
            foldedContains(folder.name, searchPattern),
          ),
        ]
      : filters;

  const [itemRows, totalRows, folderCountRows, folderPathMap] =
    await Promise.all([
      getDb()
        .select({
          id: flashcard.id,
          folderId: flashcard.folderId,
          updatedAt: flashcard.updatedAt,
          studyLaterAt: flashcard.studyLaterAt,
          lapseCount: flashcard.lapseCount,
          front: flashcard.front,
          folderName: folder.name,
        })
        .from(flashcard)
        .innerJoin(folder, eq(flashcard.folderId, folder.id))
        .where(and(...totalFilters))
        .orderBy(
          ...getFlashcardsManageOrderBy(
            normalizedSearch,
            searchPattern,
            filter,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      getDb()
        .select({ total: count() })
        .from(flashcard)
        .innerJoin(folder, eq(flashcard.folderId, folder.id))
        .where(and(...totalFilters)),
      folderId
        ? getDb()
            .select({ total: count() })
            .from(flashcard)
            .where(
              and(
                eq(flashcard.userId, userId),
                eq(flashcard.folderId, folderId),
              ),
            )
        : Promise.resolve([]),
      getFolderPathMapForUser(userId),
    ]);

  return {
    items: itemRows.map((row) => ({
      id: row.id,
      folderId: row.folderId,
      updatedAt: row.updatedAt,
      studyLaterAt: row.studyLaterAt,
      lapseCount: row.lapseCount,
      front: row.front,
      frontExcerpt: documentExcerpt(row.front, 160),
      frontTitle: documentText(row.front) || null,
      folderName: row.folderName,
      folderPath:
        (row.folderId ? folderPathMap.get(row.folderId) : undefined) ??
        row.folderName,
    })),
    total: totalRows[0]?.total ?? 0,
    folderCardCount: folderId ? (folderCountRows[0]?.total ?? 0) : null,
  };
}

export async function getFlashcardByIdForUser(
  userId: string,
  flashcardId: string,
): Promise<FlashcardEntity | null> {
  const results = await getDb()
    .select({ flashcard })
    .from(flashcard)
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  return results[0]?.flashcard ?? null;
}

export async function getFlashcardDetailByIdForUser(
  userId: string,
  flashcardId: string,
): Promise<FlashcardDetailEntity | null> {
  const results = await getDb()
    .select({ flashcard, folderName: folder.name })
    .from(flashcard)
    .innerJoin(folder, eq(flashcard.folderId, folder.id))
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  const result = results[0];
  if (!result) {
    return null;
  }

  // Resolve only this card's folder path (one ancestor-chain walk) rather than
  // materializing the whole folder path map just to read a single entry.
  const [folderPath, [cardWithSource]] = await Promise.all([
    result.flashcard.folderId
      ? getFolderPathForUser(userId, result.flashcard.folderId)
      : "",
    attachFlashcardSources(userId, [result.flashcard]),
  ]);
  return {
    ...cardWithSource,
    folderName: result.folderName,
    folderPath: folderPath || result.folderName,
  };
}

export async function getFlashcardRecordForUser(
  userId: string,
  flashcardId: string,
): Promise<Pick<FlashcardEntity, "id" | "folderId"> | null> {
  const results = await getDb()
    .select({ id: flashcard.id, folderId: flashcard.folderId })
    .from(flashcard)
    .where(and(eq(flashcard.id, flashcardId), eq(flashcard.userId, userId)))
    .limit(1);

  return results[0] ?? null;
}

export async function getFlashcardRecordsForUser(
  userId: string,
  flashcardIds: string[],
): Promise<Array<Pick<FlashcardEntity, "id" | "folderId">>> {
  if (flashcardIds.length === 0) {
    return [];
  }

  return getDb()
    .select({ id: flashcard.id, folderId: flashcard.folderId })
    .from(flashcard)
    .where(
      and(inArray(flashcard.id, flashcardIds), eq(flashcard.userId, userId)),
    );
}

export async function countFlashcardsByFolderForUser(
  userId: string,
  folderId: string,
): Promise<number> {
  const result = await getDb()
    .select({ total: count() })
    .from(flashcard)
    .where(and(eq(flashcard.folderId, folderId), eq(flashcard.userId, userId)));

  return result[0]?.total ?? 0;
}

/**
 * Loads the full content and folder path of the given owned flashcards. Ids
 * the user does not own are skipped; rows come back in no particular order.
 *
 * @example
 * const cards = await getFlashcardContentsForUser(userId, ["card-1", "card-2"]);
 */
export async function getFlashcardContentsForUser(
  userId: string,
  flashcardIds: string[],
): Promise<FlashcardContentItem[]> {
  if (flashcardIds.length === 0) {
    return [];
  }

  const [results, folderPathMap] = await Promise.all([
    getDb()
      .select({
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        folderName: folder.name,
        folderId: flashcard.folderId,
      })
      .from(flashcard)
      .innerJoin(folder, eq(flashcard.folderId, folder.id))
      .where(
        and(inArray(flashcard.id, flashcardIds), eq(flashcard.userId, userId)),
      ),
    getFolderPathMapForUser(userId),
  ]);

  return results.map((result) => ({
    ...result,
    folderPath: folderPathMap.get(result.folderId) ?? result.folderName,
  }));
}
