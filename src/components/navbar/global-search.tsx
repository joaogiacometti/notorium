"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SearchCommandGroups } from "@/components/navbar/search-command-groups";
import {
  type ContextFreeDialog,
  filterSearchCommands,
  parseSubjectIdFromPath,
} from "@/components/navbar/search-commands";
import {
  type ActiveCreateDialog,
  SearchCreateDialogs,
} from "@/components/navbar/search-create-dialogs";
import {
  FlashcardResultGroup,
  NoteResultGroup,
} from "@/components/navbar/search-result-groups";
import { useSearchCommandActions } from "@/components/navbar/use-search-command-actions";
import { useSearchResults } from "@/components/navbar/use-search-results";
import { SearchSkeleton } from "@/components/shared/search-skeleton";
import { useShortcutsDialogOpen } from "@/components/shortcuts/shortcuts-suspension-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { LIMITS } from "@/lib/config/limits";
import { fetchSubjectOptions } from "@/lib/read-api/subjects";

interface GlobalSearchProps {
  userId: string;
  aiEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * One dialog for both finding notes and flashcards and running commands
 * (create, go to, settings). Opened with Cmd/Ctrl+K or from the sidebar.
 */
export function GlobalSearch({
  userId,
  aiEnabled,
  open,
  onOpenChange,
}: Readonly<GlobalSearchProps>) {
  const shortcutsSuspended = useShortcutsDialogOpen();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startNavTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [activeDialog, setActiveDialog] = useState<ActiveCreateDialog | null>(
    null,
  );
  const [createSubjectId, setCreateSubjectId] = useState<string | null>(null);

  const { data: subjects = [] } = useQuery({
    queryKey: ["create-dialog-subjects", userId],
    queryFn: () => fetchSubjectOptions(),
    enabled: (open || activeDialog !== null) && userId.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
  const results = useSearchResults(query, userId, open);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "k" || !(e.metaKey || e.ctrlKey)) {
        return;
      }
      if (shortcutsSuspended || activeDialog !== null) {
        return;
      }
      e.preventDefault();
      onOpenChange(!open);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsSuspended, activeDialog, open, onOpenChange]);

  // cmdk keeps the search text in the shared Command context, so clear it on
  // close; otherwise the next open starts pre-filtered by the old query.
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setQuery("");
    }
  }

  function navigate(href: string) {
    handleOpenChange(false);
    startNavTransition(() => router.push(href));
  }

  const runAction = useSearchCommandActions({
    onClose: () => handleOpenChange(false),
    onNavigate: navigate,
    onCreate: (dialog: ContextFreeDialog) => {
      setCreateSubjectId(parseSubjectIdFromPath(pathname));
      setActiveDialog(dialog);
    },
  });

  const commands = filterSearchCommands(query);
  const onFlashcards = pathname === "/flashcards";
  const view = onFlashcards
    ? (searchParams.get("view") ?? undefined)
    : undefined;
  const subjectId = onFlashcards
    ? (searchParams.get("subjectId") ?? undefined)
    : undefined;
  const hasResults = results.notes.length + results.flashcards.length > 0;

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search and Commands"
        description="Search your notes and flashcards or run a command"
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          maxLength={LIMITS.searchQueryMax}
          placeholder="Search notes and flashcards, or run a command..."
        />
        <CommandList>
          {results.isPending && <SearchSkeleton />}
          {!results.isPending && commands.length === 0 && !hasResults && (
            <CommandEmpty>
              No matching commands, notes, or flashcards.
            </CommandEmpty>
          )}
          <SearchCommandGroups commands={commands} onRun={runAction} />
          <NoteResultGroup
            notes={results.notes}
            heading={results.showingRecents ? "Recent Notes" : "Notes"}
            highlightQuery={results.highlightQuery}
            onSelect={navigate}
          />
          <FlashcardResultGroup
            flashcards={results.flashcards}
            heading={
              results.showingRecents ? "Recent Flashcards" : "Flashcards"
            }
            highlightQuery={results.highlightQuery}
            detailOptions={{
              from: view ? "flashcards-manage" : undefined,
              view,
              subjectId,
            }}
            onSelect={navigate}
          />
        </CommandList>
      </CommandDialog>
      <SearchCreateDialogs
        activeDialog={activeDialog}
        subjectId={createSubjectId}
        subjects={subjects}
        aiEnabled={aiEnabled}
        onClose={() => {
          setActiveDialog(null);
          setCreateSubjectId(null);
        }}
        onNavigate={navigate}
      />
    </>
  );
}
