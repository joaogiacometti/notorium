"use client";

import { useDeferredValue, useEffect, useState } from "react";

interface UseManagerPageStateOptions<TFilter> {
  initialFilter: TFilter;
  searchDebounceMs?: number;
  onSearchChange?: (value: string) => void;
  onFilterChange?: (value: TFilter) => void;
  onInitialFilterChange?: (value: TFilter) => void;
}

export function useManagerPageState<TFilter>({
  initialFilter,
  searchDebounceMs,
  onSearchChange,
  onFilterChange,
  onInitialFilterChange,
}: Readonly<UseManagerPageStateOptions<TFilter>>) {
  const [pageIndex, setPageIndex] = useState(0);
  const [searchQuery, setSearchQueryState] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [filter, setFilterState] = useState(initialFilter);

  useEffect(() => {
    setFilterState(initialFilter);
    setPageIndex(0);
    onInitialFilterChange?.(initialFilter);
  }, [initialFilter, onInitialFilterChange]);

  useEffect(() => {
    if (searchDebounceMs === undefined) {
      setDebouncedSearchQuery(searchQuery);
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, searchDebounceMs);

    return () => clearTimeout(timeout);
  }, [searchDebounceMs, searchQuery]);

  function setSearchQuery(value: string) {
    setSearchQueryState(value);
    setPageIndex(0);
    onSearchChange?.(value);
  }

  function setFilter(value: TFilter) {
    setFilterState(value);
    setPageIndex(0);
    onFilterChange?.(value);
  }

  return {
    filter,
    pageIndex,
    resolvedSearchQuery:
      searchDebounceMs === undefined
        ? deferredSearchQuery
        : debouncedSearchQuery,
    searchQuery,
    setFilter,
    setPageIndex,
    setSearchQuery,
  };
}
