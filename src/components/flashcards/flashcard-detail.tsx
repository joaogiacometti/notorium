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
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { editFlashcard } from "@/app/actions/flashcards";
import { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import { DocumentAutosaveFeedback } from "@/components/documents/document-autosave-feedback";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/bulk-move-flashcards-dialog";
import { copyFlashcardsWithToast } from "@/components/flashcards/shared/copy-flashcards-with-toast";
import { FlashcardSourceReference } from "@/components/flashcards/shared/flashcard-source-reference";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import type { Breadcrumb } from "@/components/shared/page-top-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
} from "@/features/flashcards/validation";
import { useDocumentAutosave } from "@/lib/editor/use-document-autosave";
import type { FlashcardDetailEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface FlashcardDetailProps {
  breadcrumb: Breadcrumb;
  /** Where to navigate after the flashcard is deleted. */
  returnHref: string;
  flashcard: FlashcardDetailEntity;
  aiEnabled: boolean;
}

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
  const [isFrontImageUploading, setIsFrontImageUploading] = useState(false);
  const [isBackImageUploading, setIsBackImageUploading] = useState(false);
  const isImageUploading = isFrontImageUploading || isBackImageUploading;
  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: getEditValues(flashcard),
  });

  const watchedFront = form.watch("front");
  const watchedBack = form.watch("back");
  // AI review pauses autosave; the availability check reads autosave after render.
  const review: ReturnType<typeof useActiveFlashcardEditor> =
    useActiveFlashcardEditor({
      form,
      enabled: aiEnabled,
      resetVersion: flashcard.id,
      blocked: (): boolean => autosave.isSaving || isImageUploading,
    });
  const autosave = useDocumentAutosave({
    documentId: flashcard.id,
    initialValue: getEditValues(flashcard),
    value: {
      id: flashcard.id,
      subjectId: flashcard.subjectId ?? "",
      front: watchedFront,
      back: watchedBack,
    },
    blocked: isImageUploading || review.blocked,
    persist: async (values) => {
      if (!flashcardFormSchema.safeParse(values).success) {
        await form.trigger();
        return false;
      }
      const result = await editFlashcard({ ...values, id: flashcard.id });
      if (!result.success) {
        toast.error(t(result.errorCode, result.errorParams));
        return false;
      }
      await queryClient.invalidateQueries({ queryKey: ["search-data"] });
      return true;
    },
    onError: () => toast.error("Could not save the flashcard."),
  });

  return (
    <DetailPageLayout breadcrumb={breadcrumb} maxWidth="7xl">
      <div className="mb-4 flex min-w-0 items-start gap-2">
        {/* Mirrors the note/mindmap header: an h-10 title row, then metadata. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1
            className="truncate text-lg leading-10 font-semibold tracking-tight sm:text-xl"
            title={flashcard.subjectPath}
          >
            {flashcard.subjectPath}
          </h1>
          <FlashcardSourceReference source={flashcard.source} />
        </div>

        <div className="flex shrink-0">
          <DocumentAutosaveFeedback {...autosave} />
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

      <form
        className="grid gap-6 lg:grid-cols-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <Controller
          name="front"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="min-w-0" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-edit-flashcard-front">Front</FieldLabel>
              {review.pending?.fields.front ? (
                <FlashcardFieldReview
                  key={`${review.pending.toolCallId}-front`}
                  field="front"
                  disabled={autosave.isSaving || isImageUploading}
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
                  contentClassName="min-h-40 lg:min-h-80"
                  onImageUploadPendingChange={setIsFrontImageUploading}
                />
              )}
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="back"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="min-w-0" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-edit-flashcard-back">Back</FieldLabel>
              {review.pending?.fields.back ? (
                <FlashcardFieldReview
                  key={`${review.pending.toolCallId}-back`}
                  field="back"
                  disabled={autosave.isSaving || isImageUploading}
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
                  contentClassName="min-h-40 lg:min-h-80"
                  onImageUploadPendingChange={setIsBackImageUploading}
                />
              )}
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
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
