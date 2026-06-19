"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getDecks } from "@/app/actions/decks";
import { createFlashcard } from "@/app/actions/flashcards";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
  toCreateFlashcardPayload,
} from "@/features/flashcards/validation";
import type { DeckEntity, FlashcardEntity } from "@/lib/server/api-contracts";

/** Empty create-flashcard form values, optionally pre-selecting a deck. */
export function getCreateFlashcardFormValues(
  deckId?: string | null,
): FlashcardFormValues {
  return {
    type: "basic",
    deckId: deckId ?? "",
    front: "",
    back: "",
    clozeSource: "",
    occlusionImagePathname: "",
    occlusionRegions: [],
  };
}

interface UseCreateFlashcardFormOptions {
  open: boolean;
  aiEnabled: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
  deckId?: string;
}

/**
 * Shared create-flashcard wiring: loads decks, owns the form, and drives submit
 * via {@link useFlashcardDialogState} with `closeOnSuccess: false` so the form
 * stays open for rapid consecutive captures. Used by both the create dialog and
 * the floating flashcard window so the logic lives in exactly one place.
 *
 * @example
 * const { decks, form, dialog } = useCreateFlashcardForm({ open, aiEnabled, onOpenChange });
 */
export function useCreateFlashcardForm({
  open,
  aiEnabled,
  onOpenChange,
  onCreated,
  deckId,
}: Readonly<UseCreateFlashcardFormOptions>) {
  const [decks, setDecks] = useState<DeckEntity[]>([]);

  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: getCreateFlashcardFormValues(deckId),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    void getDecks().then((fetchedDecks) => {
      setDecks(fetchedDecks);
    });
  }, [open]);

  const dialog = useFlashcardDialogState({
    mode: "create",
    open,
    aiEnabled,
    onOpenChange,
    values: getCreateFlashcardFormValues(deckId),
    form,
    onSubmitAction: (values) =>
      createFlashcard(toCreateFlashcardPayload(values)),
    onSuccess: (flashcard) => {
      if (flashcard) {
        onCreated?.(flashcard);
      }
    },
    getSuccessValues: (submittedValues, keepValues) =>
      getCreateFlashcardResetValues(submittedValues, keepValues),
    closeOnSuccess: false,
  });

  return { decks, form, dialog };
}
