"use client";

import { useQuery } from "@tanstack/react-query";
import { BookMarked, BookOpen, FileText, Layers, Network } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getRecentSearchData, getSearchData } from "@/app/actions/search";
import { SearchSkeleton } from "@/components/shared/search-skeleton";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { LIMITS } from "@/lib/config/limits";
import { richTextToPlainText } from "@/lib/editor/rich-text";
import {
  getBookDetailHref,
  getFlashcardDetailHref,
  getMindmapDetailHref,
  getNoteDetailHref,
} from "@/lib/navigation/detail-page-back-link";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import {
  buildSearchMatchSnippet,
  renderSearchHighlightedText,
} from "@/lib/search/highlight";

interface GlobalSearchProps {
  userId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalSearch({
  userId,
  open: openProp,
  onOpenChange,
}: Readonly<GlobalSearchProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  function setOpen(next: boolean) {
    if (openProp === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  }

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startNavTransition] = useTransition();

  const { data, isPending } = useQuery({
    queryKey: ["search-data", userId, debouncedQuery],
    queryFn: () => getSearchData(debouncedQuery),
    enabled:
      open &&
      userId.length > 0 &&
      debouncedQuery.trim().length >= LIMITS.searchQueryMin,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
  const recentQuery = useQuery({
    queryKey: ["search-data", "recent", userId],
    queryFn: () => getRecentSearchData(),
    enabled:
      open &&
      userId.length > 0 &&
      debouncedQuery.trim().length < LIMITS.searchQueryMin,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (shortcutsSuspended) {
        return;
      }

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const next = !open;
        if (openProp === undefined) {
          setInternalOpen(next);
        }
        onOpenChange?.(next);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsSuspended, open, openProp, onOpenChange]);

  function handleSelect(path: string) {
    setOpen(false);
    startNavTransition(() => router.push(path));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setQuery("");
    }
  }

  const canSearch =
    userId.length > 0 && debouncedQuery.trim().length >= LIMITS.searchQueryMin;
  const highlightQuery = canSearch ? debouncedQuery.trim() : "";
  const isAuthenticated = userId.length > 0;
  const showingRecents = isAuthenticated && !canSearch;
  const currentData = canSearch ? data : recentQuery.data;
  const isResultsPending = canSearch ? isPending : recentQuery.isPending;
  const subjects = currentData?.subjects ?? [];
  const notes = currentData?.notes ?? [];
  const flashcards = currentData?.flashcards ?? [];
  const mindmaps = currentData?.mindmaps ?? [];
  const books = currentData?.books ?? [];
  const hasData =
    subjects.length > 0 ||
    notes.length > 0 ||
    flashcards.length > 0 ||
    mindmaps.length > 0 ||
    books.length > 0;
  const flashcardsView =
    pathname === "/flashcards"
      ? (searchParams.get("view") ?? undefined)
      : undefined;
  const flashcardsSubjectId =
    pathname === "/flashcards"
      ? (searchParams.get("subjectId") ?? undefined)
      : undefined;

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Global Search"
      description="Search across all your subjects, notes, flashcards, mindmaps, and books"
      commandProps={{ shouldFilter: false }}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search subjects, notes, flashcards, mindmaps, and books..."
      />
      <CommandList>
        {isResultsPending && <SearchSkeleton />}
        {!isResultsPending && !isAuthenticated && (
          <CommandEmpty>Sign in to search.</CommandEmpty>
        )}
        {!isResultsPending && isAuthenticated && !hasData && (
          <CommandEmpty>
            No subjects, notes, flashcards, mindmaps, or books yet.
          </CommandEmpty>
        )}

        {subjects.length > 0 && (
          <CommandGroup
            heading={showingRecents ? `Recent Subjects` : "Subjects"}
          >
            {subjects.map((subj) => (
              <CommandItem
                key={subj.id}
                value={subj.id}
                onSelect={() => handleSelect(`/subjects/${subj.id}`)}
                className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  <BookOpen className="!size-4 text-muted-foreground" />
                  <span className="block min-w-0 flex-1 truncate">
                    {renderSearchHighlightedText(subj.name, highlightQuery)}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {notes.length > 0 && (
          <CommandGroup heading={showingRecents ? `Recent Notes` : "Notes"}>
            {notes.map((n) => (
              <CommandItem
                key={n.id}
                value={n.id}
                onSelect={() =>
                  handleSelect(getNoteDetailHref(n.subjectId, n.id))
                }
                className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  <FileText className="!size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    {renderSearchHighlightedText(n.title, highlightQuery)}
                  </span>
                  <span className="flex min-w-0 max-w-[45%] items-center gap-1 overflow-hidden text-xs text-muted-foreground">
                    <span className="shrink-0">in</span>
                    <span className="block min-w-0 flex-1 truncate">
                      {renderSearchHighlightedText(
                        n.subjectName,
                        highlightQuery,
                      )}
                    </span>
                  </span>
                </div>
                {n.content && (
                  <span className="pl-6 text-xs text-muted-foreground line-clamp-1">
                    {renderSearchHighlightedText(
                      buildSearchMatchSnippet(
                        richTextToPlainText(n.content),
                        highlightQuery,
                        LIMITS.contentPreviewTruncate,
                      ),
                      highlightQuery,
                    )}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {flashcards.length > 0 && (
          <CommandGroup
            heading={showingRecents ? `Recent Flashcards` : "Flashcards"}
          >
            {flashcards.map((fc) => (
              <CommandItem
                key={fc.id}
                value={fc.id}
                onSelect={() =>
                  handleSelect(
                    getFlashcardDetailHref(fc.id, {
                      from: flashcardsView ? "flashcards-manage" : undefined,
                      view: flashcardsView,
                      subjectId: flashcardsSubjectId,
                    }),
                  )
                }
                className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  <Layers className="!size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    {renderSearchHighlightedText(
                      buildSearchMatchSnippet(
                        richTextToPlainText(fc.front),
                        highlightQuery,
                        80,
                      ),
                      highlightQuery,
                    )}
                  </span>
                  <span className="flex min-w-0 max-w-[45%] items-center gap-1 overflow-hidden text-xs text-muted-foreground">
                    <span className="shrink-0">in</span>
                    <span className="block flex-1 truncate">
                      {fc.subjectPath}
                    </span>
                  </span>
                </div>
                {fc.back && (
                  <span className="pl-6 text-xs text-muted-foreground line-clamp-1">
                    {renderSearchHighlightedText(
                      buildSearchMatchSnippet(
                        richTextToPlainText(fc.back),
                        highlightQuery,
                        120,
                      ),
                      highlightQuery,
                    )}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mindmaps.length > 0 && (
          <CommandGroup
            heading={showingRecents ? "Recent Mindmaps" : "Mindmaps"}
          >
            {mindmaps.map((mm) => (
              <CommandItem
                key={mm.id}
                value={mm.id}
                onSelect={() =>
                  handleSelect(getMindmapDetailHref(mm.subjectId, mm.id))
                }
                className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  <Network className="!size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    {renderSearchHighlightedText(mm.title, highlightQuery)}
                  </span>
                  <span className="flex min-w-0 max-w-[45%] items-center gap-1 overflow-hidden text-xs text-muted-foreground">
                    <span className="shrink-0">in</span>
                    <span className="block min-w-0 flex-1 truncate">
                      {renderSearchHighlightedText(
                        mm.subjectName,
                        highlightQuery,
                      )}
                    </span>
                  </span>
                </div>
                {mm.matchedNodeLabel && (
                  <span className="pl-6 text-xs text-muted-foreground line-clamp-1">
                    {renderSearchHighlightedText(
                      mm.matchedNodeLabel,
                      highlightQuery,
                    )}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {books.length > 0 && (
          <CommandGroup heading={showingRecents ? "Recent Books" : "Books"}>
            {books.map((book) => (
              <CommandItem
                key={book.id}
                value={book.id}
                onSelect={() =>
                  book.subjectId
                    ? handleSelect(getBookDetailHref(book.subjectId, book.id))
                    : undefined
                }
                className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
              >
                <div className="flex w-full min-w-0 items-center gap-2">
                  <BookMarked className="!size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    {renderSearchHighlightedText(book.title, highlightQuery)}
                  </span>
                  {book.author && (
                    <span className="flex min-w-0 max-w-[45%] items-center gap-1 overflow-hidden text-xs text-muted-foreground">
                      <span className="shrink-0">by</span>
                      <span className="block min-w-0 flex-1 truncate">
                        {renderSearchHighlightedText(
                          book.author,
                          highlightQuery,
                        )}
                      </span>
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
