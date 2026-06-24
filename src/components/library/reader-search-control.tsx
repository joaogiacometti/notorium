"use client";

import { useScroll } from "@embedpdf/plugin-scroll/react";
import { useSearch } from "@embedpdf/plugin-search/react";
import { ChevronDown, ChevronUp, LoaderCircle, Search, X } from "lucide-react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  Ref,
  RefObject,
} from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { isEditableTarget } from "@/lib/shortcuts/registry";
import { cn } from "@/lib/utils";

interface ReaderSearchControlProps {
  documentId: string;
}

const SEARCH_DEBOUNCE_MS = 450;

type SearchProvides = NonNullable<ReturnType<typeof useSearch>["provides"]>;
type MutableValue<T> = { current: T };

interface SearchQueueState {
  generation: number;
  queuedQuery: string | null;
  running: boolean;
  submittedQuery: string | null;
}

interface SearchQueueRefs {
  providesRef: MutableValue<SearchProvides | null>;
  queueRef: MutableValue<SearchQueueState>;
}

/**
 * Toolbar control for searching text inside the active PDF document.
 *
 * @example
 * <ReaderSearchControl documentId={documentId} />
 */
export function ReaderSearchControl({
  documentId,
}: Readonly<ReaderSearchControlProps>) {
  const search = useSearch(documentId);
  const { provides: scroll } = useScroll(documentId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function closeSearch() {
    search.provides?.stopSearch();
    setOpen(false);
  }

  function focusSearch() {
    setOpen(true);
    globalThis.setTimeout(() => inputRef.current?.select(), 0);
  }

  useReaderFindShortcut({ inputRef, openSearch: focusSearch });
  useSearchOnQueryChange({ query, open, searchProvides: search.provides });
  useScrollToActiveResult({
    activeResultIndex: search.state.activeResultIndex,
    results: search.state.results,
    scrollToPage: scroll?.scrollToPage,
  });

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return <ClosedSearchButton onOpen={() => setOpen(true)} />;

  return (
    <div className="flex h-8 items-center gap-1 rounded border border-border/70 bg-background px-1.5 text-muted-foreground">
      <Search className="size-4 shrink-0" />
      <SearchInput
        ref={inputRef}
        value={query}
        onChange={setQuery}
        onClose={closeSearch}
        onNext={() => search.provides?.nextResult()}
        onPrevious={() => search.provides?.previousResult()}
      />
      <SearchCount
        activeIndex={search.state.activeResultIndex}
        loading={search.state.loading}
        total={search.state.total}
      />
      <SearchNavigation
        disabled={search.state.total < 1}
        onNext={() => search.provides?.nextResult()}
        onPrevious={() => search.provides?.previousResult()}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close search"
        title="Close search"
        onClick={closeSearch}
        className="size-6 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

interface UseReaderFindShortcutOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  openSearch: () => void;
}

function useReaderFindShortcut({
  inputRef,
  openSearch,
}: Readonly<UseReaderFindShortcutOptions>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isFindShortcut(event)) return;
      if (event.target !== inputRef.current && isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      openSearch();
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [inputRef, openSearch]);
}

function isFindShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";
}

interface UseSearchOnQueryChangeOptions {
  query: string;
  open: boolean;
  searchProvides: ReturnType<typeof useSearch>["provides"];
}

function useSearchOnQueryChange({
  query,
  open,
  searchProvides,
}: Readonly<UseSearchOnQueryChangeOptions>) {
  const { providesRef, queueRef } = useSearchQueueRefs({
    open,
    searchProvides,
  });

  useEffect(() => {
    if (!open || !searchProvides) return;
    searchProvides.startSearch();
    const generation = queueRef.current.generation;
    const nextQuery = query.trim();
    const timer = globalThis.setTimeout(() => {
      runQueuedSearch(nextQuery, generation, providesRef, queueRef);
    }, SEARCH_DEBOUNCE_MS);
    return () => globalThis.clearTimeout(timer);
  }, [open, providesRef, query, queueRef, searchProvides]);
}

function useSearchQueueRefs({
  open,
  searchProvides,
}: Pick<
  UseSearchOnQueryChangeOptions,
  "open" | "searchProvides"
>): SearchQueueRefs {
  const providesRef = useRef<SearchProvides | null>(searchProvides);
  const queueRef = useRef<SearchQueueState>(createSearchQueueState());
  useEffect(() => {
    providesRef.current = searchProvides;
  }, [searchProvides]);
  useEffect(() => {
    if (open && searchProvides) return;
    resetSearchQueue(queueRef);
  }, [open, searchProvides]);
  return { providesRef, queueRef };
}

function createSearchQueueState(): SearchQueueState {
  return {
    generation: 0,
    queuedQuery: null,
    running: false,
    submittedQuery: null,
  };
}

function resetSearchQueue(queueRef: MutableValue<SearchQueueState>) {
  queueRef.current.generation += 1;
  queueRef.current.queuedQuery = null;
  queueRef.current.running = false;
  queueRef.current.submittedQuery = null;
}

function runQueuedSearch(
  query: string,
  generation: number,
  providesRef: MutableValue<SearchProvides | null>,
  queueRef: MutableValue<SearchQueueState>,
) {
  const queue = queueRef.current;
  if (queue.generation !== generation) return;
  if (queue.submittedQuery === query) return;
  if (queue.running) {
    queue.queuedQuery = query;
    return;
  }
  const provides = providesRef.current;
  if (!provides) return;
  queue.running = true;
  queue.submittedQuery = query;
  const task = provides.searchAllPages(query);
  task.wait(
    () => finishQueuedSearch(generation, providesRef, queueRef),
    () => finishQueuedSearch(generation, providesRef, queueRef),
  );
}

function finishQueuedSearch(
  generation: number,
  providesRef: MutableValue<SearchProvides | null>,
  queueRef: MutableValue<SearchQueueState>,
) {
  const queue = queueRef.current;
  if (queue.generation !== generation) return;
  queue.running = false;
  const queuedQuery = queue.queuedQuery;
  queue.queuedQuery = null;
  if (queuedQuery === null || queuedQuery === queue.submittedQuery) return;
  runQueuedSearch(queuedQuery, generation, providesRef, queueRef);
}

interface UseScrollToActiveResultOptions {
  activeResultIndex: number;
  results: ReturnType<typeof useSearch>["state"]["results"];
  scrollToPage:
    | NonNullable<ReturnType<typeof useScroll>["provides"]>["scrollToPage"]
    | undefined;
}

function useScrollToActiveResult({
  activeResultIndex,
  results,
  scrollToPage,
}: Readonly<UseScrollToActiveResultOptions>) {
  useEffect(() => {
    const result = results[activeResultIndex];
    if (!result) return;
    const rect = result.rects[0];
    scrollToPage?.({
      pageNumber: result.pageIndex + 1,
      pageCoordinates: rect
        ? {
            x: rect.origin.x + rect.size.width / 2,
            y: rect.origin.y + rect.size.height / 2,
          }
        : undefined,
      alignY: 50,
      behavior: "instant",
    });
  }, [activeResultIndex, results, scrollToPage]);
}

interface ClosedSearchButtonProps {
  onOpen: () => void;
}

function ClosedSearchButton({ onOpen }: Readonly<ClosedSearchButtonProps>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Search in book"
      title="Search in book"
      onClick={onOpen}
      className="size-8 text-muted-foreground hover:text-foreground"
    >
      <Search className="size-4" />
    </Button>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

function SearchInput({
  ref,
  value,
  onChange,
  onClose,
  onNext,
  onPrevious,
}: Readonly<SearchInputProps> & { ref: Ref<HTMLInputElement> }) {
  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") onClose();
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.shiftKey) onPrevious();
    else onNext();
  }

  return (
    <input
      ref={ref}
      type="search"
      value={value}
      aria-label="Search in book"
      placeholder="Find"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      className="h-6 w-28 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground sm:w-40"
    />
  );
}

interface SearchCountProps {
  activeIndex: number;
  loading: boolean;
  total: number;
}

function SearchCount({
  activeIndex,
  loading,
  total,
}: Readonly<SearchCountProps>) {
  const label = total > 0 ? `${activeIndex + 1}/${total}` : "0/0";
  return (
    <span className="flex min-w-12 items-center justify-end gap-1 text-xs tabular-nums">
      {loading && <LoaderCircle className="size-3 animate-spin" />}
      {label}
    </span>
  );
}

interface SearchNavigationProps {
  disabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

function SearchNavigation({
  disabled,
  onNext,
  onPrevious,
}: Readonly<SearchNavigationProps>) {
  return (
    <div className="flex items-center">
      <SearchNavButton
        label="Previous match"
        disabled={disabled}
        onClick={onPrevious}
      >
        <ChevronUp className="size-3.5" />
      </SearchNavButton>
      <SearchNavButton label="Next match" disabled={disabled} onClick={onNext}>
        <ChevronDown className="size-3.5" />
      </SearchNavButton>
    </div>
  );
}

interface SearchNavButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}

function SearchNavButton({
  label,
  disabled,
  onClick,
  children,
}: Readonly<SearchNavButtonProps>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "size-6 text-muted-foreground hover:text-foreground",
        disabled && "opacity-40",
      )}
    >
      {children}
    </Button>
  );
}
