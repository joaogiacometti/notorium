"use client";

import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FolderEntity, FolderOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface FolderSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  folders: Array<FolderEntity | FolderOption>;
  placeholder?: string;
  id?: string;
  label?: string;
  error?: string;
  ariaInvalid?: boolean;
  disabled?: boolean;
  onCreateFolder?: (name: string) => Promise<boolean>;
}

interface FolderSelectDropdownProps {
  folders: Array<FolderEntity | FolderOption>;
  value: string | null;
  listboxId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
  onCreateFolder?: (name: string) => Promise<boolean>;
  isCreatingFolder: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function getFolderLabel(folder: FolderEntity | FolderOption): string {
  return "path" in folder ? folder.path : folder.name;
}

function folderLabelMatchesQuery(label: string, query: string): boolean {
  const normalizedLabel = label.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery.includes("::")) {
    return normalizedLabel.includes(normalizedQuery);
  }

  const labelSegments = normalizedLabel.split("::");
  const querySegments = normalizedQuery.split("::");
  return querySegments.every(
    (segment, index) =>
      segment.length === 0 || labelSegments[index]?.includes(segment),
  );
}

function filterFolders(
  folders: Array<FolderEntity | FolderOption>,
  query: string,
): Array<FolderEntity | FolderOption> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return folders;
  return folders.filter((folder) =>
    folderLabelMatchesQuery(getFolderLabel(folder), normalized),
  );
}

function canCreateFolder(
  folders: Array<FolderEntity | FolderOption>,
  query: string,
): boolean {
  const name = query.trim();
  return (
    name.length > 0 &&
    !folders.some(
      (folder) => getFolderLabel(folder).toLowerCase() === name.toLowerCase(),
    )
  );
}

function FolderSelectDropdown({
  folders,
  value,
  listboxId,
  searchQuery,
  onSearchChange,
  onSelect,
  onCreateFolder,
  isCreatingFolder,
  inputRef,
}: Readonly<FolderSelectDropdownProps>) {
  const filtered = filterFolders(folders, searchQuery);
  const createName = searchQuery.trim();
  const showCreate = onCreateFolder && canCreateFolder(folders, searchQuery);

  function handleCreateSelect() {
    if (!onCreateFolder) {
      return;
    }

    void onCreateFolder(createName);
  }

  return (
    <PopoverPortal>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            value={searchQuery}
            onValueChange={onSearchChange}
            placeholder="Search folders by path"
          />
          <CommandList id={listboxId}>
            <CommandEmpty>No folders found.</CommandEmpty>
            {filtered.map((folder) => {
              const folderLabel = getFolderLabel(folder);
              const isSelected = folder.id === value;

              return (
                <CommandItem
                  key={folder.id}
                  value={folderLabel}
                  onSelect={() => onSelect(folder.id)}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{folderLabel}</span>
                </CommandItem>
              );
            })}
            {showCreate ? (
              <CommandItem
                value={`Create ${createName}`}
                disabled={isCreatingFolder}
                onSelect={handleCreateSelect}
                className="gap-2 border-border border-t"
              >
                {isCreatingFolder ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <Plus className="size-4 shrink-0" />
                )}
                <span className="truncate">Create {createName}</span>
              </CommandItem>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </PopoverPortal>
  );
}

export function FolderSelect({
  value,
  onChange,
  folders,
  placeholder = "Select a folder",
  id,
  label = "Folder",
  error,
  ariaInvalid,
  disabled,
  onCreateFolder,
}: Readonly<FolderSelectProps>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const selectedFolder = folders.find((folder) => folder.id === value) ?? null;

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setSearchQuery("");
  }

  async function handleCreateFolder(name: string) {
    if (!onCreateFolder || isCreatingFolder) {
      return false;
    }

    setIsCreatingFolder(true);
    try {
      const created = await onCreateFolder(name);
      if (created) {
        setOpen(false);
        setSearchQuery("");
      }
      return created;
    } finally {
      setIsCreatingFolder(false);
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {/* Popover open is forced false when disabled to prevent state drift from keyboard/programmatic triggers */}
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-expanded={open}
            data-invalid={ariaInvalid ? "true" : undefined}
            disabled={disabled}
            className={cn(
              "border-input data-[placeholder=true]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 data-invalid:ring-destructive/20 data-invalid:border-destructive inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            )}
            data-placeholder={selectedFolder ? undefined : "true"}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedFolder ? getFolderLabel(selectedFolder) : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <FolderSelectDropdown
          folders={folders}
          value={value}
          listboxId={listboxId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelect}
          onCreateFolder={onCreateFolder ? handleCreateFolder : undefined}
          isCreatingFolder={isCreatingFolder}
          inputRef={inputRef}
        />
      </Popover>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  );
}
