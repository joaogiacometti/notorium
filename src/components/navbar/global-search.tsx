"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Layers, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getRecentSearchData, getSearchData } from "@/app/actions/search";
import { SearchSkeleton } from "@/components/shared/search-skeleton";
import { SubjectText } from "@/components/shared/subject-text";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  getFlashcardDetailHref,
  getNoteDetailHref,
} from "@/features/navigation/detail-page-back-link";
import { LIMITS } from "@/lib/config/limits";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";

interface GlobalSearchProps {
  userId: string;
}

export function GlobalSearch({ userId }: Readonly<GlobalSearchProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const router = useRouter();
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
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsSuspended]);

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
  const isAuthenticated = userId.length > 0;
  const showingRecents = isAuthenticated && !canSearch;
  const currentData = canSearch ? data : recentQuery.data;
  const isResultsPending = canSearch ? isPending : recentQuery.isPending;
  const subjects = currentData?.subjects ?? [];
  const notes = currentData?.notes ?? [];
  const flashcards = currentData?.flashcards ?? [];
  const hasData =
    subjects.length > 0 || notes.length > 0 || flashcards.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative size-9 justify-center px-0 text-sm text-muted-foreground xl:h-9 xl:w-56 xl:justify-start xl:gap-2 xl:px-3 2xl:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Global Search"
        description="Search across all your subjects, notes, and flashcards"
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search subjects, notes, and flashcards..."
        />
        <CommandList>
          {isResultsPending && <SearchSkeleton />}
          {!isResultsPending && !isAuthenticated && (
            <CommandEmpty>Sign in to search.</CommandEmpty>
          )}
          {!isResultsPending && isAuthenticated && !hasData && (
            <CommandEmpty>No subjects, notes, or flashcards yet.</CommandEmpty>
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
                    <BookOpen className="size-4 text-muted-foreground" />
                    <SubjectText
                      value={subj.name}
                      mode="truncate"
                      className="block flex-1"
                    />
                  </div>
                  {subj.description && (
                    <span className="ml-6 text-xs text-muted-foreground line-clamp-1">
                      {subj.description}
                    </span>
                  )}
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
                    handleSelect(
                      getNoteDetailHref(n.subjectId, n.id, {
                        from: "subject",
                      }),
                    )
                  }
                  className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
                >
                  <div className="flex w-full min-w-0 items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    <span className="flex min-w-0 max-w-[45%] items-center gap-1 overflow-hidden text-xs text-muted-foreground">
                      <span className="shrink-0">in</span>
                      <SubjectText
                        value={n.subjectName}
                        mode="truncate"
                        className="block flex-1"
                      />
                    </span>
                  </div>
                  {n.content && (
                    <span className="ml-6 text-xs text-muted-foreground line-clamp-1">
                      {n.content}
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
                      getFlashcardDetailHref(fc.subjectId, fc.id, {
                        from: "flashcards-manage",
                        subjectId: fc.subjectId,
                      }),
                    )
                  }
                  className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
                >
                  <div className="flex w-full min-w-0 items-center gap-2">
                    <Layers className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      {getRichTextExcerpt(fc.front, 80)}
                    </span>
                    <span className="flex min-w-0 max-w-[45%] items-center gap-1 overflow-hidden text-xs text-muted-foreground">
                      <span className="shrink-0">in</span>
                      <SubjectText
                        value={fc.subjectName}
                        mode="truncate"
                        className="block flex-1"
                      />
                    </span>
                  </div>
                  {fc.back && (
                    <span className="ml-6 text-xs text-muted-foreground line-clamp-1">
                      {getRichTextExcerpt(fc.back, 120)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
