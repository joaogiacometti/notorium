"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";

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
  const resolvedSearchQuery = useDebouncedValue(searchQuery, searchDebounceMs);
  const [filter, setFilterState] = useState(initialFilter);

  useEffect(() => {
    setFilterState(initialFilter);
    setPageIndex(0);
    onInitialFilterChange?.(initialFilter);
  }, [initialFilter, onInitialFilterChange]);

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
    resolvedSearchQuery,
    searchQuery,
    setFilter,
    setPageIndex,
    setSearchQuery,
  };
}
