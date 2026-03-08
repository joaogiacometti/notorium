"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Layers, Search } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useRouter } from "@/i18n/routing";
import { getRichTextExcerpt } from "@/lib/rich-text";

interface GlobalSearchProps {
  userId: string;
}

export function GlobalSearch({ userId }: Readonly<GlobalSearchProps>) {
  const t = useTranslations("GlobalSearch");
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
  const flashcards = data?.flashcards ?? [];
  const hasData =
    subjects.length > 0 || notes.length > 0 || flashcards.length > 0;
  const canSearch = userId.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative size-9 justify-center px-0 text-sm text-muted-foreground xl:h-9 xl:w-56 xl:justify-start xl:gap-2 xl:px-3 2xl:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="hidden xl:inline-flex">{t("trigger")}</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={t("dialog_title")}
        description={t("dialog_description")}
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t("input_placeholder")}
        />
        <CommandList>
          {isPending && <SearchSkeleton />}
          {!isPending && !hasData && (
            <CommandEmpty>
              {canSearch ? t("empty_has_data") : t("empty_sign_in")}
            </CommandEmpty>
          )}

          {subjects.length > 0 && (
            <CommandGroup heading={t("subjects_group")}>
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
            <CommandGroup heading={t("notes_group")}>
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
                      {t("in_subject")} {n.subjectName}
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
            <CommandGroup heading={t("flashcards_group")}>
              {flashcards.map((fc) => (
                <CommandItem
                  key={fc.id}
                  value={fc.id}
                  onSelect={() =>
                    handleSelect(
                      `/subjects/${fc.subjectId}/flashcards/${fc.id}`,
                    )
                  }
                  className="flex cursor-pointer flex-col items-start gap-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-muted-foreground" />
                    <span>{getRichTextExcerpt(fc.front, 80)}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("in_subject")} {fc.subjectName}
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
