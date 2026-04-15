"use client";

import { Layers, Lock, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreateDeckDialog } from "@/components/decks/create-deck-dialog";
import { DeleteDeckDialog } from "@/components/decks/delete-deck-dialog";
import { EditDeckDialog } from "@/components/decks/edit-deck-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LIMITS } from "@/lib/config/limits";
import type { DeckWithCount } from "@/lib/server/api-contracts";
import { getStatusToneClasses } from "@/lib/ui/status-tones";

interface DecksListProps {
  decks: DeckWithCount[];
}

type DeckEditTarget = {
  id: string;
  name: string;
  description: string | null;
};

type DeckDeleteTarget = {
  id: string;
  name: string;
  flashcardCount: number;
};

export function DecksList({ decks }: Readonly<DecksListProps>) {
  const [deckItems, setDeckItems] = useState(decks);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DeckEditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeckDeleteTarget | null>(
    null,
  );
  const warningTone = getStatusToneClasses("warning");

  useEffect(() => {
    setDeckItems(decks);
  }, [decks]);

  const isAtLimit = deckItems.length >= LIMITS.maxDecksPerUser;
  const totalFlashcards = deckItems.reduce(
    (sum, d) => sum + d.flashcardCount,
    0,
  );

  function getDeckCountText() {
    return `${deckItems.length}/${LIMITS.maxDecksPerUser} decks · ${totalFlashcards} flashcards`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Decks</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {getDeckCountText()}
          </p>
        </div>
        <CreateDeckDialog
          trigger={
            <Button
              size="sm"
              className="w-full gap-1.5 sm:w-auto"
              disabled={isAtLimit}
              title={isAtLimit ? "You cannot create more decks" : undefined}
            >
              <Plus className="size-4" />
              <span>New Deck</span>
            </Button>
          }
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(createdDeck) => {
            setDeckItems((currentDecks) => [
              ...currentDecks,
              {
                ...createdDeck,
                flashcardCount: 0,
              },
            ]);
          }}
        />
      </div>

      {isAtLimit && (
        <div
          className={`mb-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${warningTone.border} ${warningTone.bg}`}
        >
          <Lock className={`size-4 shrink-0 ${warningTone.text}`} />
          <p className={warningTone.text}>
            {`You've reached the limit of ${LIMITS.maxDecksPerUser} decks. Please delete existing ones to create more.`}
          </p>
        </div>
      )}

      {deckItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold">No decks yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first deck to organize your flashcards.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deckItems.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onEditRequested={() =>
                setEditTarget({
                  id: deck.id,
                  name: deck.name,
                  description: deck.description,
                })
              }
              onDeleteRequested={() =>
                setDeleteTarget({
                  id: deck.id,
                  name: deck.name,
                  flashcardCount: deck.flashcardCount,
                })
              }
            />
          ))}
        </div>
      )}

      {editTarget && (
        <EditDeckDialog
          deck={editTarget}
          open
          onSaved={(updatedDeck) => {
            setDeckItems((currentDecks) =>
              currentDecks.map((currentDeck) =>
                currentDeck.id === updatedDeck.id
                  ? {
                      ...currentDeck,
                      ...updatedDeck,
                      flashcardCount: currentDeck.flashcardCount,
                    }
                  : currentDeck,
              ),
            );
          }}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteDeckDialog
          deckId={deleteTarget.id}
          deckName={deleteTarget.name}
          flashcardCount={deleteTarget.flashcardCount}
          open
          onDeleted={(deletedDeckId) => {
            setDeckItems((currentDecks) => {
              const deletedDeck = currentDecks.find(
                (currentDeck) => currentDeck.id === deletedDeckId,
              );

              if (!deletedDeck) {
                return currentDecks;
              }

              return currentDecks.filter(
                (currentDeck) => currentDeck.id !== deletedDeckId,
              );
            });
          }}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

interface DeckCardProps {
  deck: DeckWithCount;
  onEditRequested: () => void;
  onDeleteRequested: () => void;
}

function DeckCard({
  deck,
  onEditRequested,
  onDeleteRequested,
}: Readonly<DeckCardProps>) {
  return (
    <Card
      data-testid="deck-card"
      className="group relative min-w-0 overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <Link
          href={`/flashcards?view=manage&deckId=${deck.id}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <Layers className="size-4" />
          </div>
          <CardTitle className="flex min-w-0 items-center gap-2 text-base leading-tight">
            <span className="truncate">{deck.name}</span>
          </CardTitle>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Open deck actions"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onEditRequested}
              className="cursor-pointer"
            >
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDeleteRequested}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <Link
        href={`/flashcards?view=manage&deckId=${deck.id}`}
        className="block rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <CardContent className="space-y-1.5 pt-0">
          {deck.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {deck.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60">
            {deck.flashcardCount} flashcard
            {deck.flashcardCount === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}
