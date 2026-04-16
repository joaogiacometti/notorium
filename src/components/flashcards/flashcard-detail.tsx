"use client";

import { ArrowLeft, CreditCard, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getDecks } from "@/app/actions/decks";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { LazyEditFlashcardDialog as EditFlashcardDialog } from "@/components/flashcards/dialogs/lazy-edit-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { LazyTiptapRenderer as TiptapRenderer } from "@/components/shared/lazy-tiptap-renderer";
import { Button } from "@/components/ui/button";
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
        <>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 sm:flex-none"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground sm:flex-none"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </>
      }
      backHref={backHref}
      backIcon={ArrowLeft}
      backLabel={backLabel}
      meta={
        <>
          {currentFlashcard.deckPath ? (
            <span className="truncate" title={currentFlashcard.deckPath}>
              {currentFlashcard.deckPath}
            </span>
          ) : null}
          <span>Created {formatRelativeTime(currentFlashcard.createdAt)}</span>
        </>
      }
      title={getRichTextExcerpt(currentFlashcard.front, 120)}
      titleIcon={CreditCard}
    >
      <div className="space-y-4">
        <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground/80">
            Front
          </h2>
          <TiptapRenderer
            content={currentFlashcard.front}
            className="min-w-0 wrap-break-word hyphens-auto text-sm sm:text-base"
          />
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground/80">
            Back
          </h2>
          <TiptapRenderer
            content={currentFlashcard.back}
            className="min-w-0 wrap-break-word hyphens-auto text-sm sm:text-base"
          />
        </div>
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
