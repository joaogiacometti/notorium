"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createFlashcard } from "@/app/actions/flashcards";
import { createSubject, getSubjectOptions } from "@/app/actions/subjects";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { getCreateFlashcardResetValues } from "@/features/flashcards/create-reset";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
  toCreateFlashcardPayload,
} from "@/features/flashcards/validation";
import type {
  FlashcardEntity,
  SubjectOption,
} from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

/** Empty create-flashcard form values, optionally pre-selecting a subject. */
export function getCreateFlashcardFormValues(
  subjectId?: string | null,
): FlashcardFormValues {
  return {
    type: "basic",
    subjectId: subjectId ?? "",
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
  subjectId?: string;
}

/**
 * Shared create-flashcard wiring: loads subjects, owns the form, and drives submit
 * via {@link useFlashcardDialogState} with `closeOnSuccess: false` so the form
 * stays open for rapid consecutive captures. Used by both the create dialog and
 * the floating flashcard window so the logic lives in exactly one place.
 *
 * @example
 * const { subjects, form, dialog } = useCreateFlashcardForm({ open, aiEnabled, onOpenChange });
 */
export function useCreateFlashcardForm({
  open,
  aiEnabled,
  onOpenChange,
  onCreated,
  subjectId,
}: Readonly<UseCreateFlashcardFormOptions>) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: getCreateFlashcardFormValues(subjectId),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    void getSubjectOptions().then((fetchedSubjects) => {
      setSubjects(fetchedSubjects);
    });
  }, [open]);

  async function handleCreateSubject(name: string): Promise<boolean> {
    const result = await createSubject({ name, kind: "general" });
    if (!result.success) {
      toast.error(t(result.errorCode, result.errorParams));
      return false;
    }

    const fetchedSubjects = await getSubjectOptions();
    setSubjects(fetchedSubjects);
    form.setValue("subjectId", result.subjectId ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    return true;
  }

  const dialog = useFlashcardDialogState({
    mode: "create",
    open,
    aiEnabled,
    onOpenChange,
    values: getCreateFlashcardFormValues(subjectId),
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

  return { subjects, form, dialog, handleCreateSubject };
}
