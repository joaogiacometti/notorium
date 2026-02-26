"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSearchData } from "@/app/actions/search";
import { SearchSkeleton } from "@/components/search-skeleton";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface GlobalSearchProps {
  userId: string;
}

export function GlobalSearch({ userId }: Readonly<GlobalSearchProps>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  const { data, isPending } = useQuery({
    queryKey: ["search-data", userId, debouncedQuery],
    queryFn: () => getSearchData(debouncedQuery),
    enabled: open && userId.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelect(path: string) {
    setOpen(false);
    router.push(path);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setQuery("");
      setDebouncedQuery("");
    }
  }

  const subjects = data?.subjects ?? [];
  const notes = data?.notes ?? [];
  const hasData = subjects.length > 0 || notes.length > 0;
  const canSearch = userId.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative size-9 justify-center px-0 text-sm text-muted-foreground lg:h-9 lg:w-56 lg:justify-start lg:gap-2 lg:px-3 xl:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 lg:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Global Search"
        description="Search across all your subjects and notes"
        showCloseButton={false}
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search subjects and notes..."
        />
        <CommandList>
          {isPending && <SearchSkeleton />}
          {!isPending && !hasData && (
            <CommandEmpty>
              {canSearch ? "No subjects or notes yet." : "Sign in to search."}
            </CommandEmpty>
          )}

          {subjects.length > 0 && (
            <CommandGroup heading="Subjects">
              {subjects.map((subj) => (
                <CommandItem
                  key={subj.id}
                  value={subj.id}
                  onSelect={() => handleSelect(`/subjects/${subj.id}`)}
                  className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-muted-foreground" />
                    <span>{subj.name}</span>
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
            <CommandGroup heading="Notes">
              {notes.map((n) => (
                <CommandItem
                  key={n.id}
                  value={n.id}
                  onSelect={() =>
                    handleSelect(`/subjects/${n.subjectId}/notes/${n.id}`)
                  }
                  className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span>{n.title}</span>
                    <span className="text-xs text-muted-foreground">
                      in {n.subjectName}
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
        </CommandList>
      </CommandDialog>
    </>
  );
}
