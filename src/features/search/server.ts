"use server";

import { getSearchDataForUser } from "@/features/search/queries";
import type { SearchData } from "@/lib/api/contracts";
import { getAuthenticatedUserId } from "@/lib/auth";
import { searchQuerySchema } from "@/lib/validations/search";

export async function getSearchData(query?: string): Promise<SearchData> {
  const userId = await getAuthenticatedUserId();
  const parsed = searchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return { subjects: [], notes: [], flashcards: [] };
  }

  return getSearchDataForUser(userId, parsed.data);
}
