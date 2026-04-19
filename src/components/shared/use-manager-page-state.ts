"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";

interface UseManagerPageStateOptions<TFilter> {
  initialFilter: TFilter;
  initialSearchQuery?: string;
  searchDebounceMs?: number;
  onSearchChange?: (value: string) => void;
  onFilterChange?: (value: TFilter) => void;
  onInitialFilterChange?: (value: TFilter) => void;
}

export function useManagerPageState<TFilter>({
  initialFilter,
  initialSearchQuery = "",
  searchDebounceMs,
  onSearchChange,
  onFilterChange,
  onInitialFilterChange,
}: Readonly<UseManagerPageStateOptions<TFilter>>) {
  const [pageIndex, setPageIndex] = useState(0);
  const [searchQuery, setSearchQueryState] = useState(initialSearchQuery);
  const resolvedSearchQuery = useDebouncedValue(searchQuery, searchDebounceMs);
  const [filter, setFilterState] = useState(initialFilter);
  const onInitialFilterChangeRef = useRef(onInitialFilterChange);
  onInitialFilterChangeRef.current = onInitialFilterChange;

  useEffect(() => {
    setFilterState(initialFilter);
    setPageIndex(0);
    onInitialFilterChangeRef.current?.(initialFilter);
  }, [initialFilter]);

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
