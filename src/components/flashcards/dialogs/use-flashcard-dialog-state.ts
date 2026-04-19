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
import { cleanupDiscardedEditorAttachments } from "@/features/attachments/client-cleanup";
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
  aiEnabled: boolean;
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
  aiEnabled,
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
  const [editorResetVersion, setEditorResetVersion] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDuplicateCheckVersionRef = useRef(duplicateCheckVersion);
  const previousOpenRef = useRef(false);
  const previousValuesRef = useRef<TValues | null>(null);
  const savedValuesRef = useRef(values);
  const currentValues = useWatch({ control: form.control }) as TValues;

  useEffect(() => {
    latestDuplicateCheckVersionRef.current = duplicateCheckVersion;
  }, [duplicateCheckVersion]);

  useEffect(() => {
    if (!open && mode === "create") {
      setKeepFrontAfterSubmit(false);
      setKeepBackAfterSubmit(false);
    }
  }, [mode, open]);

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
      savedValuesRef.current = values;
    }

    previousOpenRef.current = open;
    previousValuesRef.current = values;
  }, [form, open, values]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

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

  async function handleDiscardChanges() {
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    await cleanupDiscardedEditorAttachments(
      [currentValues.front, currentValues.back],
      [savedValuesRef.current.front, savedValuesRef.current.back],
    );
    form.reset(savedValuesRef.current);
    setPreviousBack(null);
    setProposedBack(null);
    setDiscardDialogOpen(false);
    setIsSaved(false);
    onOpenChange(false);
  }

  async function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDiscardDialogOpen(false);
      if (mode === "create") {
        setKeepFrontAfterSubmit(false);
        setKeepBackAfterSubmit(false);
      }
      onOpenChange(true);
      return;
    }

    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    setIsSaved(false);

    const hasFrontContent = hasRichTextContent(currentValues.front);
    const hasBackContent = hasRichTextContent(currentValues.back);
    const hasContent = hasFrontContent || hasBackContent;
    const savedValues = savedValuesRef.current;
    const hasUnsavedChanges =
      mode === "edit"
        ? currentValues.front !== savedValues.front ||
          currentValues.back !== savedValues.back ||
          currentValues.deckId !== savedValues.deckId
        : hasContent;

    if ((hasUnsavedChanges || proposedBack) && !isSubmitting) {
      setDiscardDialogOpen(true);
      return;
    }

    await cleanupDiscardedEditorAttachments(
      [currentValues.front, currentValues.back],
      [savedValuesRef.current.front, savedValuesRef.current.back],
    );
    form.reset(savedValuesRef.current);
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

      const successValues = getSuccessValues(data, {
        keepFrontAfterSubmit,
        keepBackAfterSubmit,
      });

      form.reset(successValues);
      savedValuesRef.current = successValues;
      setEditorResetVersion((currentVersion) => currentVersion + 1);
      setDuplicateCheckVersion((currentVersion) => currentVersion + 1);
      setDiscardDialogOpen(false);
      await onSuccess?.(result.flashcard);

      if (closeOnSuccess) {
        onOpenChange(false);
      } else {
        setIsSaved(true);
        if (savedTimerRef.current) {
          clearTimeout(savedTimerRef.current);
        }
        savedTimerRef.current = setTimeout(() => {
          setIsSaved(false);
        }, 1200);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateBack() {
    if (!aiEnabled) {
      return;
    }

    const hasBack = hasRichTextContent(currentValues.back);

    if (!hasRichTextContent(currentValues.front) || isGeneratingBack) {
      return;
    }

    if (hasBack) {
      setPreviousBack(currentValues.back);
    }

    setIsGeneratingBack(true);

    const result = await generateFlashcardBack({
      deckId: currentValues.deckId ?? "",
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
    aiEnabled &&
    (currentValues.deckId ?? "").length > 0 &&
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
    isSaved,
    previousBack,
    proposedBack,
    editorResetVersion,
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
