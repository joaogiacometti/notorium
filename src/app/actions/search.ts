"use server";

import {
  getRecentSearchDataForUser,
  getSearchDataForUser,
} from "@/features/search/queries";
import { getAuthenticatedUserId } from "@/lib/auth/auth";
import { LIMITS } from "@/lib/config/limits";
import type { SearchData } from "@/lib/server/api-contracts";
import { searchQuerySchema } from "@/lib/validations/search";

export async function getSearchData(query?: string): Promise<SearchData> {
  const userId = await getAuthenticatedUserId();
  const parsed = searchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return { subjects: [], notes: [], flashcards: [] };
  }

  if (parsed.data.length < LIMITS.searchQueryMin) {
    return { subjects: [], notes: [], flashcards: [] };
  }

  return getSearchDataForUser(userId, parsed.data);
}

export async function getRecentSearchData(): Promise<SearchData> {
  const userId = await getAuthenticatedUserId();
  return getRecentSearchDataForUser(userId);
}
