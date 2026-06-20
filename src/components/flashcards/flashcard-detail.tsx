"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Loader2,
  MoreVertical,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editFlashcard, generateFlashcardBack } from "@/app/actions/flashcards";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { FlashcardBackDiff } from "@/components/flashcards/dialogs/flashcard-back-diff";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/bulk-move-flashcards-dialog";
import { OcclusionCardFace } from "@/components/flashcards/occlusion/occlusion-card-face";
import { AppPageContainer } from "@/components/shared/app-page-container";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import {
  type BreadcrumbItem,
  PageTopBar,
} from "@/components/shared/page-top-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldError } from "@/components/ui/field";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
  hasRichTextContent,
  toEditFlashcardPayload,
} from "@/features/flashcards/validation";
import { formatRelativeTime } from "@/lib/dates/format";
import { useBeforeUnload } from "@/lib/editor/use-before-unload";
import { useDebouncedValue } from "@/lib/react/use-debounced-value";
import type { FlashcardDetailEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface FlashcardDetailProps {
  breadcrumb: BreadcrumbItem[];
  /** Where to navigate after the flashcard is deleted. */
  returnHref: string;
  flashcard: FlashcardDetailEntity;
  aiEnabled: boolean;
}

const AUTOSAVE_DELAY_MS = 800;

function getFlashcardEditType(
  type: FlashcardDetailEntity["type"],
): FlashcardFormValues["type"] {
  if (type === "cloze") {
    return "cloze";
  }
  if (type === "occlusion") {
    return "occlusion";
  }
  return "basic";
}

function getEditValues(flashcard: FlashcardDetailEntity): FlashcardFormValues {
  return {
    id: flashcard.id,
    type: getFlashcardEditType(flashcard.type),
    subjectId: flashcard.subjectId ?? "",
    front: flashcard.front,
    back: flashcard.back,
    clozeSource: flashcard.clozeSource ?? "",
    occlusionImagePathname: flashcard.occlusionImagePathname ?? "",
    occlusionRegions: flashcard.occlusionRegions ?? [],
  };
}

function isSameFlashcardEdit(a: FlashcardFormValues, b: FlashcardFormValues) {
  return a.front === b.front && a.back === b.back;
}

export function FlashcardDetail({
  breadcrumb,
  returnHref,
  flashcard,
  aiEnabled,
}: Readonly<FlashcardDetailProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startNavTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  // Stable reference required — BulkMoveFlashcardsDialog has `ids` in its effect deps
  const moveIds = useMemo(() => [flashcard.id], [flashcard.id]);
  const [isSaving, setIsSaving] = useState(false);
  const [isFrontImageUploading, setIsFrontImageUploading] = useState(false);
  const [isBackImageUploading, setIsBackImageUploading] = useState(false);
  const [isGeneratingAiBack, setIsGeneratingAiBack] = useState(false);
  const [aiProposedBack, setAiProposedBack] = useState<string | null>(null);
  const [aiPreviousBack, setAiPreviousBack] = useState<string | null>(null);
  const isImageUploading = isFrontImageUploading || isBackImageUploading;
  const lastSavedValuesRef = useRef(getEditValues(flashcard));
  const saveSequenceRef = useRef(0);

  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: getEditValues(flashcard),
  });

  const watchedFront = form.watch("front");
  const watchedBack = form.watch("back");
  // useMemo required for correctness: prevents the debounce timer from resetting
  // on every render — must only reset when a field value actually changes
  const watchedValues = useMemo(
    () => ({ front: watchedFront, back: watchedBack }),
    [watchedFront, watchedBack],
  );
  const debouncedValues = useDebouncedValue(watchedValues, AUTOSAVE_DELAY_MS);

  let aiBackLabel: string;
  if (isGeneratingAiBack) {
    aiBackLabel = "Generating...";
  } else if (hasRichTextContent(watchedBack)) {
    aiBackLabel = "Improve with AI";
  } else {
    aiBackLabel = "Generate with AI";
  }

  const hasDirtyValues = !isSameFlashcardEdit(
    form.getValues(),
    lastSavedValuesRef.current,
  );

  useBeforeUnload(hasDirtyValues || isSaving || isImageUploading);

  const saveFlashcardValues = useCallback(
    async (values: FlashcardFormValues) => {
      // Cloze and occlusion notes are edited through the create/edit dialog
      // where the source is authored; front/back autosave does not apply.
      if (flashcard.type === "cloze" || flashcard.type === "occlusion") {
        return false;
      }

      const isValid = await form.trigger();
      if (!isValid) {
        return false;
      }

      const saveSequence = saveSequenceRef.current + 1;
      saveSequenceRef.current = saveSequence;
      setIsSaving(true);

      const result = await editFlashcard(
        toEditFlashcardPayload(values as FlashcardFormValues & { id: string }),
      );

      if (saveSequence !== saveSequenceRef.current) {
        return result.success;
      }

      setIsSaving(false);

      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return false;
      }

      lastSavedValuesRef.current = values;
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      if (isSameFlashcardEdit(form.getValues(), values)) {
        form.reset(values);
      }

      return true;
    },
    [form, queryClient, flashcard.type],
  );

  async function handleGenerateAiBack() {
    setIsGeneratingAiBack(true);
    const currentBack = hasRichTextContent(watchedBack)
      ? watchedBack
      : undefined;
    const result = await generateFlashcardBack({
      subjectId: flashcard.subjectId ?? "",
      front: watchedFront,
      currentBack,
    });
    setIsGeneratingAiBack(false);

    if (!result.success) {
      toast.error(t(result.errorCode, result.errorParams));
      return;
    }

    setAiPreviousBack(watchedBack);
    setAiProposedBack(result.back);
  }

  function handleAiAccept() {
    if (!aiProposedBack) return;
    form.setValue("back", aiProposedBack, { shouldDirty: true });
    setAiProposedBack(null);
    setAiPreviousBack(null);
  }

  function handleAiReject() {
    setAiProposedBack(null);
    setAiPreviousBack(null);
  }

  useEffect(() => {
    const nextValues: FlashcardFormValues = {
      id: flashcard.id,
      type: getFlashcardEditType(flashcard.type),
      subjectId: flashcard.subjectId ?? "",
      front: debouncedValues.front,
      back: debouncedValues.back,
      clozeSource: flashcard.clozeSource ?? "",
      occlusionImagePathname: flashcard.occlusionImagePathname ?? "",
      occlusionRegions: flashcard.occlusionRegions ?? [],
    };

    if (isSameFlashcardEdit(nextValues, lastSavedValuesRef.current)) {
      return;
    }

    if (isImageUploading) {
      return;
    }

    void saveFlashcardValues(nextValues);
  }, [
    debouncedValues,
    flashcard.id,
    flashcard.subjectId,
    flashcard.type,
    flashcard.clozeSource,
    flashcard.occlusionImagePathname,
    flashcard.occlusionRegions,
    isImageUploading,
    saveFlashcardValues,
  ]);

  return (
    <>
      <PageTopBar breadcrumb={breadcrumb} />
      <AppPageContainer maxWidth="3xl">
        <div className="mb-6 flex min-w-0 items-start justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span
              className="truncate text-sm font-medium text-foreground"
              title={flashcard.subjectPath}
            >
              Subject: {flashcard.subjectPath}
            </span>
            <span className="text-xs text-muted-foreground/60">
              Created {formatRelativeTime(flashcard.createdAt)}
            </span>
          </div>

          <div className="flex shrink-0">
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
                  onClick={() => setResetOpen(true)}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setMoveOpen(true)}
                >
                  <ArrowRightLeft className="size-4" />
                  Move
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
          </div>
        </div>

        {flashcard.type === "occlusion" && flashcard.occlusionImagePathname ? (
          <div className="flex flex-col items-center gap-3">
            <OcclusionCardFace
              imagePathname={flashcard.occlusionImagePathname}
              regions={flashcard.occlusionRegions ?? []}
              testedMaskId={flashcard.occlusionMaskId}
              revealed
            />
            <p className="text-sm text-muted-foreground">
              Edit the image and masks from the flashcards list. This page is
              read-only for image occlusion cards.
            </p>
          </div>
        ) : (
          <form className="space-y-4">
            <Controller
              name="front"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="min-w-0 space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Front
                  </h2>
                  <TiptapEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Front of the flashcard..."
                    id="form-edit-flashcard-front"
                    aria-invalid={fieldState.invalid}
                    imageUploadContext="flashcards"
                    contentClassName="min-h-40"
                    onImageUploadPendingChange={setIsFrontImageUploading}
                  />
                  {fieldState.invalid ? (
                    <FieldError className="mt-2" errors={[fieldState.error]} />
                  ) : null}
                </div>
              )}
            />

            <Controller
              name="back"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Back
                    </h2>
                    {aiEnabled ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-7 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
                        onClick={() => void handleGenerateAiBack()}
                        disabled={
                          !hasRichTextContent(watchedFront) ||
                          isGeneratingAiBack ||
                          !!aiProposedBack
                        }
                      >
                        {isGeneratingAiBack ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        {aiBackLabel}
                      </Button>
                    ) : null}
                  </div>
                  {aiProposedBack && aiPreviousBack !== null ? (
                    <FlashcardBackDiff
                      previousBack={aiPreviousBack}
                      proposedBack={aiProposedBack}
                      originalLabel="Original"
                      proposedLabel="Proposed"
                      acceptLabel="Accept"
                      rejectLabel="Reject"
                      onAccept={handleAiAccept}
                      onReject={handleAiReject}
                    />
                  ) : (
                    <TiptapEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Back of the flashcard..."
                      id="form-edit-flashcard-back"
                      aria-invalid={fieldState.invalid}
                      imageUploadContext="flashcards"
                      contentClassName="min-h-40"
                      onImageUploadPendingChange={setIsBackImageUploading}
                    />
                  )}
                  {fieldState.invalid ? (
                    <FieldError className="mt-2" errors={[fieldState.error]} />
                  ) : null}
                </div>
              )}
            />
          </form>
        )}

        <ResetFlashcardDialog
          flashcardId={flashcard.id}
          flashcardFront={watchedFront}
          open={resetOpen}
          onOpenChange={setResetOpen}
          onReset={() => setResetOpen(false)}
        />
        <BulkMoveFlashcardsDialog
          ids={moveIds}
          open={moveOpen}
          onOpenChange={setMoveOpen}
          onMoved={() => setMoveOpen(false)}
        />
        <DeleteFlashcardDialog
          flashcardId={flashcard.id}
          flashcardFront={watchedFront}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => {
            setDeleteOpen(false);
            startNavTransition(() => router.push(returnHref));
          }}
        />
      </AppPageContainer>
    </>
  );
}
