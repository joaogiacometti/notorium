"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Copy,
  MoreVertical,
  RotateCcw,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
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
import { editFlashcard } from "@/app/actions/flashcards";
import { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/bulk-move-flashcards-dialog";
import { copyFlashcardsWithToast } from "@/components/flashcards/shared/copy-flashcards-with-toast";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import type { BreadcrumbItem } from "@/components/shared/page-top-bar";
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
const FlashcardFieldReview = dynamic(
  () =>
    import("@/components/flashcards/dialogs/flashcard-field-review").then(
      (module) => module.FlashcardFieldReview,
    ),
  { ssr: false },
);

function getEditValues(flashcard: FlashcardDetailEntity): FlashcardFormValues {
  return {
    id: flashcard.id,
    subjectId: flashcard.subjectId ?? "",
    front: flashcard.front,
    back: flashcard.back,
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

  const review = useActiveFlashcardEditor({
    form,
    enabled: aiEnabled,
    resetVersion: flashcard.id,
    blocked: isSaving || isImageUploading,
  });
  const hasDirtyValues = !isSameFlashcardEdit(
    form.getValues(),
    lastSavedValuesRef.current,
  );

  useBeforeUnload(
    hasDirtyValues || isSaving || isImageUploading || review.blocked,
  );

  const saveFlashcardValues = useCallback(
    async (values: FlashcardFormValues) => {
      const isValid = await form.trigger();
      if (!isValid) {
        return false;
      }

      const saveSequence = saveSequenceRef.current + 1;
      saveSequenceRef.current = saveSequence;
      setIsSaving(true);

      const result = await editFlashcard({ ...values, id: flashcard.id });

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
    [form, queryClient, flashcard.id],
  );

  useEffect(() => {
    const nextValues: FlashcardFormValues = {
      id: flashcard.id,
      subjectId: flashcard.subjectId ?? "",
      front: debouncedValues.front,
      back: debouncedValues.back,
    };

    if (isSameFlashcardEdit(nextValues, lastSavedValuesRef.current)) {
      return;
    }

    if (isImageUploading || review.blocked) {
      return;
    }

    void saveFlashcardValues(nextValues);
  }, [
    debouncedValues,
    flashcard.id,
    flashcard.subjectId,
    isImageUploading,
    review.blocked,
    saveFlashcardValues,
  ]);

  return (
    <DetailPageLayout breadcrumb={breadcrumb} maxWidth="3xl">
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
                onClick={() =>
                  void copyFlashcardsWithToast([
                    {
                      front: watchedFront,
                      back: watchedBack,
                      subjectPath: flashcard.subjectPath,
                    },
                  ])
                }
              >
                <Copy className="size-4" />
                Copy
              </DropdownMenuItem>
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

      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <Controller
          name="front"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="min-w-0 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Front
              </h2>
              {review.pending?.fields.front ? (
                <FlashcardFieldReview
                  key={`${review.pending.toolCallId}-front`}
                  field="front"
                  disabled={isSaving || isImageUploading}
                  proposal={review.pending.fields.front}
                  onDecide={(accept) => review.decide?.("front", accept)}
                />
              ) : (
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
              )}
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
              </div>
              {review.pending?.fields.back ? (
                <FlashcardFieldReview
                  key={`${review.pending.toolCallId}-back`}
                  field="back"
                  disabled={isSaving || isImageUploading}
                  proposal={review.pending.fields.back}
                  onDecide={(accept) => review.decide?.("back", accept)}
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
    </DetailPageLayout>
  );
}
