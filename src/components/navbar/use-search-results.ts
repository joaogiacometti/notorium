"use client";

import { useQuery } from "@tanstack/react-query";
import { LIMITS } from "@/lib/config/limits";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import { fetchSearchData } from "@/lib/read-api/search";
import type { SearchData } from "@/lib/server/api-contracts";

const NO_SEARCH_DATA: SearchData = { notes: [], flashcards: [] };

interface SearchResults {
  notes: SearchData["notes"];
  flashcards: SearchData["flashcards"];
  /** True while a typed query has no matches to show yet. */
  isSearching: boolean;
  /** Trimmed query to highlight. */
  highlightQuery: string;
}

/**
 * Loads notes and flashcards matching `query` (debounced). Nothing loads until
 * the query reaches the search minimum, and a refined query keeps the previous
 * matches on screen until its own arrive, so typing never blanks the list.
 */
export function useSearchResults(
  query: string,
  userId: string,
  open: boolean,
): SearchResults {
  const debouncedQuery = useDebouncedValue(query, 200).trim();
  const isAuthenticated = userId.length > 0;
  const canSearch =
    isAuthenticated && debouncedQuery.length >= LIMITS.searchQueryMin;

  const searchQuery = useQuery({
    queryKey: ["search-data", userId, debouncedQuery],
    queryFn: () => fetchSearchData(debouncedQuery),
    enabled: open && canSearch,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  if (!isAuthenticated || query.trim().length < LIMITS.searchQueryMin) {
    return { ...NO_SEARCH_DATA, isSearching: false, highlightQuery: "" };
  }
  if (!canSearch) {
    // Typed past the minimum but still debouncing.
    return { ...NO_SEARCH_DATA, isSearching: true, highlightQuery: "" };
  }
  const { notes, flashcards } = searchQuery.data ?? NO_SEARCH_DATA;
  return {
    notes,
    flashcards,
    isSearching: searchQuery.isPending,
    highlightQuery: debouncedQuery,
  };
}
