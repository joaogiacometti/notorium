"use client";

import { Check, ChevronsUpDown } from "lucide-react";
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
import type { DeckEntity, DeckOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface DeckSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  decks: Array<DeckEntity | DeckOption>;
  placeholder?: string;
  id?: string;
  label?: string;
  error?: string;
  ariaInvalid?: boolean;
  disabled?: boolean;
}

interface DeckSelectDropdownProps {
  decks: Array<DeckEntity | DeckOption>;
  value: string | null;
  listboxId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function getDeckLabel(deck: DeckEntity | DeckOption): string {
  return "path" in deck ? deck.path : deck.name;
}

function filterDecks(
  decks: Array<DeckEntity | DeckOption>,
  query: string,
): Array<DeckEntity | DeckOption> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return decks;
  return decks.filter((deck) =>
    getDeckLabel(deck).toLowerCase().includes(normalized),
  );
}

function DeckSelectDropdown({
  decks,
  value,
  listboxId,
  searchQuery,
  onSearchChange,
  onSelect,
  inputRef,
}: Readonly<DeckSelectDropdownProps>) {
  const filtered = filterDecks(decks, searchQuery);

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
            placeholder="Search decks by path"
          />
          <CommandList id={listboxId}>
            <CommandEmpty>No decks found.</CommandEmpty>
            {filtered.map((deck) => {
              const deckLabel = getDeckLabel(deck);
              const isSelected = deck.id === value;

              return (
                <CommandItem
                  key={deck.id}
                  value={deckLabel}
                  onSelect={() => onSelect(deck.id)}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{deckLabel}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </PopoverPortal>
  );
}

export function DeckSelect({
  value,
  onChange,
  decks,
  placeholder = "Select a deck",
  id,
  label = "Deck",
  error,
  ariaInvalid,
  disabled,
}: Readonly<DeckSelectProps>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const selectedDeck = decks.find((deck) => deck.id === value) ?? null;

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
              "border-input data-[placeholder=true]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 data-invalid:ring-destructive/20 data-invalid:border-destructive inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            )}
            data-placeholder={selectedDeck ? undefined : "true"}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedDeck ? getDeckLabel(selectedDeck) : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <DeckSelectDropdown
          decks={decks}
          value={value}
          listboxId={listboxId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleSelect}
          inputRef={inputRef}
        />
      </Popover>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  );
}
