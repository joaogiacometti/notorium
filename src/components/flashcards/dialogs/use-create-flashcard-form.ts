"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createFlashcard } from "@/app/actions/flashcards";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { useCreateInlineFolderPicker } from "@/components/shared/use-create-inline-folder-picker";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import type { FlashcardSource } from "@/features/flashcards/source-contract";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
} from "@/features/flashcards/validation";
import { emptyDocument, type RichTextDocument } from "@/lib/editor/document";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

/** Rich-text front and back that prefill a new card, such as an AI proposal. */
export interface CreateFlashcardInitialCard {
  front: RichTextDocument;
  back: RichTextDocument;
  source?: FlashcardSource;
}

/**
 * Create-flashcard form values, optionally pre-selecting a folder and
 * prefilling the card.
 *
 * @example
 * getCreateFlashcardFormValues("folder-1", { front: "<p>Q</p>", back: "<p>A</p>" });
 */
export function getCreateFlashcardFormValues(
  folderId?: string | null,
  initialCard?: CreateFlashcardInitialCard,
): FlashcardFormValues {
  return {
    folderId: folderId ?? "",
    ...(initialCard?.source ? { source: initialCard.source } : {}),
    front: initialCard?.front ?? emptyDocument(),
    back: initialCard?.back ?? emptyDocument(),
  };
}

interface UseCreateFlashcardFormOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
  folderId?: string;
  initialCard?: CreateFlashcardInitialCard;
}

/**
 * Shared create-flashcard wiring: loads folders, owns the form, and drives submit
 * via {@link useFlashcardDialogState} with `closeOnSuccess: false` so the form
 * stays open for rapid consecutive captures.
 *
 * @example
 * const { folders, form, dialog } = useCreateFlashcardForm({ open, onOpenChange });
 */
export function useCreateFlashcardForm({
  open,
  onOpenChange,
  onCreated,
  folderId,
  initialCard,
}: Readonly<UseCreateFlashcardFormOptions>) {
  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: getCreateFlashcardFormValues(folderId, initialCard),
  });
  const { folders, handleCreateFolder } = useCreateInlineFolderPicker({
    open,
    loadFoldersOnOpen: true,
    onFolderCreated: (createdFolderId) =>
      form.setValue("folderId", createdFolderId, {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  const dialog = useFlashcardDialogState({
    mode: "create",
    open,
    onOpenChange,
    values: getCreateFlashcardFormValues(folderId, initialCard),
    form,
    onSubmitAction: (values) => createFlashcard(values),
    onSuccess: (flashcard) => {
      if (flashcard) {
        onCreated?.(flashcard);
      }
    },
    getSuccessValues: (submittedValues, keepValues) =>
      getCreateFlashcardResetValues(submittedValues, keepValues),
    closeOnSuccess: false,
  });

  return { folders, form, dialog, handleCreateFolder };
}
