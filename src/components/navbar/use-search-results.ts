"use client";

import { useQuery } from "@tanstack/react-query";
import { LIMITS } from "@/lib/config/limits";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import { fetchRecentSearchData, fetchSearchData } from "@/lib/read-api/search";
import type { SearchData } from "@/lib/server/api-contracts";

const SEARCH_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 15,
} as const;

interface SearchResults {
  notes: SearchData["notes"];
  flashcards: SearchData["flashcards"];
  isPending: boolean;
  /** True when results are the recent items shown before the user types. */
  showingRecents: boolean;
  /** Trimmed query to highlight; empty while showing recents. */
  highlightQuery: string;
}

/**
 * Loads search matches for `query` (debounced), or recent notes and flashcards
 * while the query is shorter than the search minimum.
 */
export function useSearchResults(
  query: string,
  userId: string,
  open: boolean,
): SearchResults {
  const debouncedQuery = useDebouncedValue(query, 200);
  const isAuthenticated = userId.length > 0;
  const canSearch =
    isAuthenticated && debouncedQuery.trim().length >= LIMITS.searchQueryMin;

  const searchQuery = useQuery({
    queryKey: ["search-data", userId, debouncedQuery],
    queryFn: () => fetchSearchData(debouncedQuery),
    enabled: open && canSearch,
    ...SEARCH_QUERY_OPTIONS,
  });
  const recentQuery = useQuery({
    queryKey: ["search-data", "recent", userId],
    queryFn: () => fetchRecentSearchData(),
    enabled: open && isAuthenticated && !canSearch,
    ...SEARCH_QUERY_OPTIONS,
  });

  const active = canSearch ? searchQuery : recentQuery;
  return {
    notes: active.data?.notes ?? [],
    flashcards: active.data?.flashcards ?? [],
    isPending: active.isPending,
    showingRecents: isAuthenticated && !canSearch,
    highlightQuery: canSearch ? debouncedQuery.trim() : "",
  };
}
