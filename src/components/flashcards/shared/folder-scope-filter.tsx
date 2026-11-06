"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FlashcardsView } from "@/features/flashcards/view";
import { useSmoothedLoadingState } from "@/lib/react/use-smoothed-loading-state";
import type { FolderOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface FolderScopeFilterProps {
  folders: FolderOption[];
  view: FlashcardsView;
  selectedFolderId?: string;
  className?: string;
  onPendingChange?: (pending: boolean) => void;
}

const allFoldersValue = "__all_folders__";

/**
 * Folder filter for the flashcards hub. Replaces the old in-page deck tree:
 * picking a folder scopes the current view to that folder (and descendants)
 * by setting `?folderId`; "All folders" clears the filter.
 *
 * @example
 * <FolderScopeFilter folders={folders} view="manage" selectedFolderId="s-1" />
 */
export function FolderScopeFilter({
  folders,
  view,
  selectedFolderId,
  className,
  onPendingChange,
}: Readonly<FolderScopeFilterProps>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const isPending = pendingFolderId !== null;
  const isPendingVisible = useSmoothedLoadingState(isPending, {
    delayMs: 0,
    minimumVisibleMs: 180,
  });
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const selectedLabel = selectedFolder?.path ?? "All folders";
  const filteredFolders = getFilteredFolders(folders, searchQuery);

  useEffect(() => {
    if (pendingFolderId === null) {
      return;
    }

    const requestedId =
      pendingFolderId === allFoldersValue ? undefined : pendingFolderId;

    if (selectedFolderId === requestedId) {
      setPendingFolderId(null);
    }
  }, [selectedFolderId, pendingFolderId]);

  useEffect(() => {
    onPendingChange?.(isPendingVisible);
  }, [isPendingVisible, onPendingChange]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  function handleSelect(value: string) {
    const nextFolderId = value === allFoldersValue ? undefined : value;
    setOpen(false);
    setSearchQuery("");

    if (nextFolderId === selectedFolderId) {
      return;
    }

    setPendingFolderId(value);

    startTransition(() => {
      router.replace(getScopeHref(view, nextFolderId));
    });
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-testid="folder-scope-filter"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label="Filter by folder"
            disabled={isPending}
            className="inline-flex h-9 w-full max-w-xs items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedLabel}
            </span>
            {isPendingVisible ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search folder paths"
            />
            <CommandList>
              <CommandEmpty>No folders found.</CommandEmpty>
              <ScopeCommandItem
                value={allFoldersValue}
                label="All folders"
                selected={!selectedFolderId}
                onSelect={handleSelect}
              />
              {filteredFolders.map((folder) => (
                <ScopeCommandItem
                  key={folder.id}
                  value={folder.id}
                  label={folder.path}
                  selected={folder.id === selectedFolderId}
                  onSelect={handleSelect}
                />
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ScopeCommandItem({
  value,
  label,
  selected,
  onSelect,
}: Readonly<{
  value: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
}>) {
  return (
    <CommandItem
      value={label}
      onSelect={() => onSelect(value)}
      className="gap-2"
    >
      <Check
        className={cn(
          "size-4 shrink-0",
          selected ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="truncate">{label}</span>
    </CommandItem>
  );
}

function getFilteredFolders(folders: FolderOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return folders;
  }

  return folders.filter((folder) =>
    folder.path.toLowerCase().includes(normalizedQuery),
  );
}

function getScopeHref(view: FlashcardsView, folderId?: string) {
  const params = new URLSearchParams();
  params.set("view", view);

  if (folderId) {
    params.set("folderId", folderId);
  }

  return `/flashcards?${params.toString()}`;
}
