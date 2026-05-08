"use client";

import { Check, ChevronsUpDown } from "lucide-react";
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
import type { DeckOption } from "@/lib/server/api-contracts";
import { cn } from "@/lib/utils";

interface MobileDeckScopePickerProps {
  decks: DeckOption[];
  view: FlashcardsView;
  selectedDeckId?: string;
  className?: string;
}

const allDecksValue = "__all_decks__";

/**
 * Shows a compact deck scope selector for mobile flashcard review.
 *
 * @example
 * <MobileDeckScopePicker decks={decks} selectedDeckId="deck-1" />
 */
export function MobileDeckScopePicker({
  decks,
  view,
  selectedDeckId,
  className,
}: Readonly<MobileDeckScopePickerProps>) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId);
  const selectedLabel = selectedDeck?.path ?? "All Decks";
  const filteredDecks = getFilteredDecks(decks, searchQuery);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  function handleSelect(value: string) {
    const nextDeckId = value === allDecksValue ? undefined : value;
    setOpen(false);
    setSearchQuery("");

    if (nextDeckId === selectedDeckId) {
      return;
    }

    startTransition(() => {
      router.replace(getScopeHref(view, nextDeckId));
    });
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-card/85 p-3 shadow-xs",
        className,
      )}
      data-testid="mobile-deck-scope-picker"
    >
      <p
        id="mobile-deck-scope-picker-label"
        className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
      >
        Deck scope
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-labelledby="mobile-deck-scope-picker-label"
            className="mt-2 inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedLabel}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
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
              placeholder="Search deck paths"
            />
            <CommandList>
              <CommandEmpty>No decks found.</CommandEmpty>
              <ScopeCommandItem
                value={allDecksValue}
                label="All Decks"
                selected={!selectedDeckId}
                onSelect={handleSelect}
              />
              {filteredDecks.map((deck) => (
                <ScopeCommandItem
                  key={deck.id}
                  value={deck.id}
                  label={deck.path}
                  selected={deck.id === selectedDeckId}
                  onSelect={handleSelect}
                />
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </section>
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

function getFilteredDecks(decks: DeckOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return decks;
  }

  return decks.filter((deck) =>
    deck.path.toLowerCase().includes(normalizedQuery),
  );
}

function getScopeHref(view: FlashcardsView, deckId?: string) {
  const params = new URLSearchParams();
  params.set("view", view);

  if (deckId) {
    params.set("deckId", deckId);
  }

  return `/flashcards?${params.toString()}`;
}
