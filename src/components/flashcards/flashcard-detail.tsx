"use client";

import {
  ArrowLeft,
  BookOpenText,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getDecks } from "@/app/actions/decks";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/dates/format";
import { getRichTextExcerpt } from "@/lib/editor/rich-text";
import type { FlashcardDetailEntity } from "@/lib/server/api-contracts";

interface FlashcardDetailProps {
  backHref: string;
  backLabel: string;
  flashcard: FlashcardDetailEntity;
  aiEnabled: boolean;
}

export function FlashcardDetail({
  backHref,
  backLabel,
  flashcard,
  aiEnabled,
}: Readonly<FlashcardDetailProps>) {
  const router = useRouter();
  const [, startNavTransition] = useTransition();

  const [currentFlashcard, setCurrentFlashcard] =
    useState<FlashcardDetailEntity>(flashcard);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <DetailPageLayout
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="size-10 shrink-0"
              aria-label="Open flashcard actions"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw className="size-4" />
              Reset
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      backHref={backHref}
      backIcon={ArrowLeft}
      backLabel={backLabel}
      meta={
        <>
          {currentFlashcard.deckPath ? (
            <span className="truncate" title={currentFlashcard.deckPath}>
              Deck: {currentFlashcard.deckPath}
            </span>
          ) : null}
          <span>Created {formatRelativeTime(currentFlashcard.createdAt)}</span>
        </>
      }
      description="Front"
      title={getRichTextExcerpt(currentFlashcard.front, 120)}
      titleIcon={BookOpenText}
    >
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground/80">Back</h2>
        <TiptapRenderer
          content={currentFlashcard.back}
          className="min-w-0 wrap-break-word hyphens-auto text-sm sm:text-base"
        />
      </div>

      <EditFlashcardDialog
        flashcard={currentFlashcard}
        open={editOpen}
        onOpenChange={setEditOpen}
        aiEnabled={aiEnabled}
        onUpdated={async (updated) => {
          let deckName = currentFlashcard.deckName;
          let deckPath = currentFlashcard.deckPath;

          if (updated.deckId !== currentFlashcard.deckId) {
            const decks = await getDecks();
            const nextDeck = decks.find((deck) => deck.id === updated.deckId);
            deckName = nextDeck?.name ?? "";
            deckPath = nextDeck?.path ?? deckName;
          }

          setCurrentFlashcard({
            ...updated,
            deckName,
            deckPath,
          });
        }}
        onDeleted={() => {
          setEditOpen(false);
          startNavTransition(() => router.push(backHref));
        }}
      />
      <ResetFlashcardDialog
        flashcardId={currentFlashcard.id}
        flashcardFront={currentFlashcard.front}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onReset={(updated) =>
          setCurrentFlashcard((current) => ({
            ...updated,
            deckName: current.deckName,
            deckPath: current.deckPath,
          }))
        }
      />
      <DeleteFlashcardDialog
        flashcardId={currentFlashcard.id}
        flashcardFront={currentFlashcard.front}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          setDeleteOpen(false);
          startNavTransition(() => router.push(backHref));
        }}
      />
    </DetailPageLayout>
  );
}
