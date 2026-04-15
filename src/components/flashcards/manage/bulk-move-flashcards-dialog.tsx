"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { getDecks } from "@/app/actions/decks";
import { bulkMoveFlashcards } from "@/app/actions/flashcards";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { DeckSelect } from "@/components/shared/deck-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import {
  type BulkMoveFlashcardsForm,
  bulkMoveFlashcardsSchema,
} from "@/features/flashcards/validation";
import type { DeckEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface BulkMoveFlashcardsDialogProps {
  ids: string[];
  open: boolean;
  onMoved: (ids: string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function BulkMoveFlashcardsDialog({
  ids,
  open,
  onMoved,
  onOpenChange,
}: Readonly<BulkMoveFlashcardsDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const [decks, setDecks] = useState<DeckEntity[]>([]);
  const form = useForm<BulkMoveFlashcardsForm>({
    resolver: zodResolver(bulkMoveFlashcardsSchema),
    defaultValues: {
      ids,
      deckId: "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({ ids, deckId: "" });
    void getDecks().then((fetchedDecks) => setDecks(fetchedDecks));
  }, [form, ids, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({ ids, deckId: "" });
    }
    onOpenChange(nextOpen);
  }

  function onSubmit(values: BulkMoveFlashcardsForm) {
    startTransition(async () => {
      const result = await bulkMoveFlashcards(values);

      if (result.success) {
        onMoved(result.ids);
        onOpenChange(false);
        form.reset({ ids: [], deckId: "" });
        return;
      }

      toast.error(t(result.errorCode, result.errorParams));
    });
  }

  const count = ids.length;
  const descriptionText =
    count === 1
      ? "Move 1 selected flashcard to another deck."
      : `Move ${count} selected flashcards to another deck.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Flashcards</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-5">
            <Controller
              name="deckId"
              control={form.control}
              render={({ field, fieldState }) => (
                <DeckSelect
                  value={field.value ?? null}
                  onChange={field.onChange}
                  decks={decks}
                  id="bulk-move-flashcards-deck"
                  error={fieldState.error?.message as string}
                  ariaInvalid={fieldState.invalid}
                />
              )}
            />
            <DialogFooter className="gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                <AsyncButtonContent
                  pending={isPending}
                  idleLabel="Move"
                  pendingLabel="Moving..."
                />
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
