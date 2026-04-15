"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeckEntity } from "@/lib/server/api-contracts";

interface FlashcardsStatisticsFiltersProps {
  decks: DeckEntity[];
  deckId?: string;
}

function buildStatisticsHref(deckId?: string) {
  const params = new URLSearchParams();
  params.set("view", "statistics");

  if (deckId) {
    params.set("deckId", deckId);
  }

  return `/flashcards?${params.toString()}`;
}

export function FlashcardsStatisticsFilters({
  decks,
  deckId,
}: Readonly<FlashcardsStatisticsFiltersProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDeckChange(value: string) {
    const nextDeckId = value === "all" ? undefined : value;

    startTransition(() => {
      router.replace(buildStatisticsHref(nextDeckId));
    });
  }

  return (
    <div className="grid min-w-0 w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
      {decks.length > 0 ? (
        <div className="min-w-0">
          <Select
            value={deckId ?? "all"}
            onValueChange={handleDeckChange}
            disabled={isPending}
          >
            <SelectTrigger
              className="h-10 w-full rounded-lg border-border/70 bg-background px-3.5 shadow-xs sm:w-auto sm:min-w-32 sm:max-w-64"
              data-testid="flashcard-statistics-deck-filter"
            >
              <SelectValue placeholder="Filter by deck" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">All decks</SelectItem>
              {decks.map((deck) => (
                <SelectItem key={deck.id} value={deck.id}>
                  {deck.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
