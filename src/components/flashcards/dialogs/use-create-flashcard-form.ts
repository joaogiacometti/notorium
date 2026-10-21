"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createFlashcard } from "@/app/actions/flashcards";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { useCreateInlineSubjectPicker } from "@/components/shared/use-create-inline-subject-picker";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
} from "@/features/flashcards/validation";
import type { FlashcardEntity } from "@/lib/server/api-contracts";

/** Rich-text front and back that prefill a new card, such as an AI proposal. */
export interface CreateFlashcardInitialCard {
  front: string;
  back: string;
}

/**
 * Create-flashcard form values, optionally pre-selecting a subject and
 * prefilling the card.
 *
 * @example
 * getCreateFlashcardFormValues("subject-1", { front: "<p>Q</p>", back: "<p>A</p>" });
 */
export function getCreateFlashcardFormValues(
  subjectId?: string | null,
  initialCard?: CreateFlashcardInitialCard,
): FlashcardFormValues {
  return {
    subjectId: subjectId ?? "",
    front: initialCard?.front ?? "",
    back: initialCard?.back ?? "",
  };
}

interface UseCreateFlashcardFormOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (flashcard: FlashcardEntity) => void;
  subjectId?: string;
  initialCard?: CreateFlashcardInitialCard;
}

/**
 * Shared create-flashcard wiring: loads subjects, owns the form, and drives submit
 * via {@link useFlashcardDialogState} with `closeOnSuccess: false` so the form
 * stays open for rapid consecutive captures. Used by both the create dialog and
 * the floating flashcard window so the logic lives in exactly one place.
 *
 * @example
 * const { subjects, form, dialog } = useCreateFlashcardForm({ open, onOpenChange });
 */
export function useCreateFlashcardForm({
  open,
  onOpenChange,
  onCreated,
  subjectId,
  initialCard,
}: Readonly<UseCreateFlashcardFormOptions>) {
  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: getCreateFlashcardFormValues(subjectId, initialCard),
  });
  const { subjects, handleCreateSubject } = useCreateInlineSubjectPicker({
    open,
    loadSubjectsOnOpen: true,
    onSubjectCreated: (createdSubjectId) =>
      form.setValue("subjectId", createdSubjectId, {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  const dialog = useFlashcardDialogState({
    mode: "create",
    open,
    onOpenChange,
    values: getCreateFlashcardFormValues(subjectId, initialCard),
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

  return { subjects, form, dialog, handleCreateSubject };
}
