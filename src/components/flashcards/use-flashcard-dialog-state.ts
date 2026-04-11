"use client";

import { useEffect, useRef, useState } from "react";
import {
  type Path,
  type PathValue,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import {
  checkFlashcardDuplicate,
  generateFlashcardBack,
} from "@/app/actions/flashcards";
import { shouldSyncFlashcardDialogValues } from "@/features/flashcards/dialog-sync";
import {
  type CreateFlashcardForm,
  hasRichTextContent,
} from "@/features/flashcards/validation";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import type { FlashcardEntity } from "@/lib/server/api-contracts";
import type { ActionErrorResult } from "@/lib/server/server-action-errors";
import { t } from "@/lib/server/server-action-errors";

type FlashcardFormValues = CreateFlashcardForm & { id?: string };

interface UseFlashcardDialogStateOptions<TValues extends FlashcardFormValues> {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: TValues;
  form: UseFormReturn<TValues>;
  onSubmitAction: (
    values: TValues,
  ) => Promise<
    { success: true; flashcard?: FlashcardEntity } | ActionErrorResult
  >;
  onSuccess?: (flashcard?: FlashcardEntity) => void | Promise<void>;
  getSuccessValues: (
    values: TValues,
    options: {
      keepFrontAfterSubmit: boolean;
      keepBackAfterSubmit: boolean;
    },
  ) => TValues;
  closeOnSuccess: boolean;
}

export function useFlashcardDialogState<TValues extends FlashcardFormValues>({
  mode,
  open,
  onOpenChange,
  values,
  form,
  onSubmitAction,
  onSuccess,
  getSuccessValues,
  closeOnSuccess,
}: Readonly<UseFlashcardDialogStateOptions<TValues>>) {
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [isGeneratingBack, setIsGeneratingBack] = useState(false);
  const [previousBack, setPreviousBack] = useState<string | null>(null);
  const [proposedBack, setProposedBack] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDuplicateFront, setIsCheckingDuplicateFront] =
    useState(false);
  const [isDuplicateFront, setIsDuplicateFront] = useState(false);
  const [duplicateCheckVersion, setDuplicateCheckVersion] = useState(0);
  const [keepFrontAfterSubmit, setKeepFrontAfterSubmit] = useState(false);
  const [keepBackAfterSubmit, setKeepBackAfterSubmit] = useState(false);
  const latestDuplicateCheckVersionRef = useRef(duplicateCheckVersion);
  const previousOpenRef = useRef(false);
  const previousValuesRef = useRef<TValues | null>(null);
  const currentValues = useWatch({ control: form.control }) as TValues;

  useEffect(() => {
    latestDuplicateCheckVersionRef.current = duplicateCheckVersion;
  }, [duplicateCheckVersion]);

  const previousFrontRef = useRef(currentValues.front);
  useEffect(() => {
    if (previousFrontRef.current !== currentValues.front) {
      previousFrontRef.current = currentValues.front;
      setPreviousBack(null);
      setProposedBack(null);
    }
  }, [currentValues.front]);

  useEffect(() => {
    if (
      shouldSyncFlashcardDialogValues({
        open,
        wasOpen: previousOpenRef.current,
        previousValues: previousValuesRef.current,
        nextValues: values,
      })
    ) {
      form.reset(values);
    }

    previousOpenRef.current = open;
    previousValuesRef.current = values;
  }, [form, open, values]);

  useBeforeUnload(
    open && (form.formState.isDirty || Boolean(proposedBack)) && !isSubmitting,
  );

  useEffect(() => {
    let active = true;
    const currentDuplicateCheckVersion = duplicateCheckVersion;

    if (!open) {
      setIsCheckingDuplicateFront(false);
      setIsDuplicateFront(false);
      return () => {
        active = false;
      };
    }

    if (
      !hasRichTextContent(currentValues.front) ||
      form.getFieldState("front" as Path<TValues>).invalid
    ) {
      setIsCheckingDuplicateFront(false);
      setIsDuplicateFront(false);
      return () => {
        active = false;
      };
    }

    setIsCheckingDuplicateFront(true);
    const timeoutId = globalThis.setTimeout(() => {
      void checkFlashcardDuplicate({
        id: currentValues.id,
        front: currentValues.front,
      }).then((result) => {
        if (
          !active ||
          currentDuplicateCheckVersion !==
            latestDuplicateCheckVersionRef.current
        ) {
          return;
        }

        setIsCheckingDuplicateFront(false);

        if (!result.success) {
          setIsDuplicateFront(false);
          return;
        }

        setIsDuplicateFront(result.duplicate);
      });
    }, 400);

    return () => {
      active = false;
      globalThis.clearTimeout(timeoutId);
    };
  }, [
    currentValues.front,
    currentValues.id,
    duplicateCheckVersion,
    form,
    open,
  ]);

  function handleDiscardChanges() {
    form.reset(values);
    setPreviousBack(null);
    setProposedBack(null);
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDiscardDialogOpen(false);
      if (mode === "create") {
        setKeepFrontAfterSubmit(false);
        setKeepBackAfterSubmit(false);
      }
      onOpenChange(true);
      return;
    }

    const hasFrontContent = hasRichTextContent(currentValues.front);
    const hasBackContent = hasRichTextContent(currentValues.back);
    const hasContent = hasFrontContent || hasBackContent;
    const hasUnsavedChanges =
      mode === "edit"
        ? currentValues.front !== values.front ||
          currentValues.back !== values.back ||
          currentValues.subjectId !== values.subjectId ||
          currentValues.deckId !== values.deckId
        : hasContent;

    if ((hasUnsavedChanges || proposedBack) && !isSubmitting) {
      setDiscardDialogOpen(true);
      return;
    }

    form.reset(values);
    setPreviousBack(null);
    setProposedBack(null);
    setDiscardDialogOpen(false);
    onOpenChange(false);
  }

  async function handleSubmit(data: TValues) {
    if (isDuplicateFront || isCheckingDuplicateFront || isSubmitting) {
      return;
    }

    if (proposedBack) {
      form.setValue(
        "back" as Path<TValues>,
        proposedBack as PathValue<TValues, Path<TValues>>,
        {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        },
      );
      setPreviousBack(null);
      setProposedBack(null);
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmitAction(data);
      if (!result.success) {
        if (result.errorCode === "flashcards.duplicateFront") {
          setIsDuplicateFront(true);
          return;
        }

        toast.error(t(result.errorCode, result.errorParams));
        return;
      }

      form.reset(
        getSuccessValues(data, {
          keepFrontAfterSubmit,
          keepBackAfterSubmit,
        }),
      );
      setDuplicateCheckVersion((currentVersion) => currentVersion + 1);
      setDiscardDialogOpen(false);
      await onSuccess?.(result.flashcard);

      if (closeOnSuccess) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateBack() {
    const hasBack = hasRichTextContent(currentValues.back);

    if (!hasRichTextContent(currentValues.front) || isGeneratingBack) {
      return;
    }

    if (hasBack) {
      setPreviousBack(currentValues.back);
    }

    setIsGeneratingBack(true);

    const result = await generateFlashcardBack({
      subjectId: currentValues.subjectId,
      deckId: currentValues.deckId ?? null,
      front: currentValues.front,
      currentBack: hasBack ? currentValues.back : undefined,
    });

    setIsGeneratingBack(false);

    if (!result.success) {
      setPreviousBack(null);
      setProposedBack(null);
      toast.error(t(result.errorCode, result.errorParams));
      return;
    }

    if (hasBack) {
      setProposedBack(result.back);
    } else {
      form.setValue(
        "back" as Path<TValues>,
        result.back as PathValue<TValues, Path<TValues>>,
        {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        },
      );
    }
  }

  function handleAcceptBack() {
    if (!proposedBack) return;
    form.setValue(
      "back" as Path<TValues>,
      proposedBack as PathValue<TValues, Path<TValues>>,
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
    setPreviousBack(null);
    setProposedBack(null);
  }

  function handleRejectBack() {
    setPreviousBack(null);
    setProposedBack(null);
  }

  const canUseAiBack =
    currentValues.subjectId.length > 0 &&
    hasRichTextContent(currentValues.front) &&
    !isGeneratingBack &&
    !isSubmitting &&
    !proposedBack &&
    !previousBack;

  return {
    discardDialogOpen,
    setDiscardDialogOpen,
    isGeneratingBack,
    isSubmitting,
    previousBack,
    proposedBack,
    keepFrontAfterSubmit,
    setKeepFrontAfterSubmit,
    keepBackAfterSubmit,
    setKeepBackAfterSubmit,
    canUseAiBack,
    isDuplicateFront,
    isCheckingDuplicateFront,
    duplicateFrontMessage: t("flashcards.duplicateFront"),
    handleDiscardChanges,
    handleOpenChange,
    handleSubmit,
    handleGenerateBack,
    handleAcceptBack,
    handleRejectBack,
  };
}
