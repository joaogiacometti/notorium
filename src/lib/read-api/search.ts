import { fetchReadApi } from "@/lib/read-api/read-api-client";
import type { SearchData } from "@/lib/server/api-contracts";

/**
 * Run a global search; the server returns empty groups for short queries.
 *
 * @example
 * const results = await fetchSearchData("mitosis");
 */
export function fetchSearchData(query: string): Promise<SearchData> {
  return fetchReadApi<SearchData>("/api/search", { q: query });
}

/**
 * Load the recent items shown before the user types.
 *
 * @example
 * const recent = await fetchRecentSearchData();
 */
export function fetchRecentSearchData(): Promise<SearchData> {
  return fetchReadApi<SearchData>("/api/search/recent");
}
