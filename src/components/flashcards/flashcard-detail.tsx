"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Clock, type LucideIcon, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { editFlashcard } from "@/app/actions/flashcards";
import { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import { DocumentAutosaveFeedback } from "@/components/documents/document-autosave-feedback";
import { DeleteFlashcardDialog } from "@/components/flashcards/dialogs/delete-flashcard-dialog";
import { ResetFlashcardDialog } from "@/components/flashcards/dialogs/reset-flashcard-dialog";
import { BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/bulk-move-flashcards-dialog";
import { copyFlashcardsWithToast } from "@/components/flashcards/shared/copy-flashcards-with-toast";
import { getEditFlashcardFormValues } from "@/components/flashcards/shared/edit-flashcard-form-values";
import { FlashcardActionMenuItems } from "@/components/flashcards/shared/flashcard-action-menu-items";
import { FlashcardCardEditor } from "@/components/flashcards/shared/flashcard-card-editor";
import { FlashcardSourceReference } from "@/components/flashcards/shared/flashcard-source-reference";
import { saveFlashcardsArchived } from "@/components/flashcards/shared/save-flashcard-mark";
import { toggleStudyLater } from "@/components/flashcards/shared/toggle-study-later";
import { DetailPageLayout } from "@/components/shared/detail-page-layout";
import type { Breadcrumb } from "@/components/shared/page-top-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
} from "@/features/flashcards/validation";
import { invalidateFlashcardViews } from "@/lib/client-cache/invalidation";
import { useDocumentAutosave } from "@/lib/editor/use-document-autosave";
import type { FlashcardDetailEntity } from "@/lib/server/api-contracts";
import { t } from "@/lib/server/server-action-errors";

interface FlashcardDetailProps {
  breadcrumb: Breadcrumb;
  /** Where to navigate after the flashcard is deleted. */
  returnHref: string;
  flashcard: FlashcardDetailEntity;
}

export function FlashcardDetail({
  breadcrumb,
  returnHref,
  flashcard,
}: Readonly<FlashcardDetailProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startNavTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  // The page is server-rendered and the mark write skips revalidation, so the
  // saved mark is kept locally.
  const [studyLaterAt, setStudyLaterAt] = useState(flashcard.studyLaterAt);
  const [archivedAt, setArchivedAt] = useState(flashcard.archivedAt);
  // Stable reference required — BulkMoveFlashcardsDialog has `ids` in its effect deps
  const moveIds = useMemo(() => [flashcard.id], [flashcard.id]);
  const [isFrontImageUploading, setIsFrontImageUploading] = useState(false);
  const [isBackImageUploading, setIsBackImageUploading] = useState(false);
  const isImageUploading = isFrontImageUploading || isBackImageUploading;
  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: getEditFlashcardFormValues(flashcard),
  });

  const watchedFront = form.watch("front");
  const watchedBack = form.watch("back");
  // AI review pauses autosave; the availability check reads autosave after render.
  const review: ReturnType<typeof useActiveFlashcardEditor> =
    useActiveFlashcardEditor({
      form,
      enabled: true,
      resetVersion: flashcard.id,
      blocked: (): boolean => autosave.isSaving || isImageUploading,
    });
  const autosave = useDocumentAutosave({
    documentId: flashcard.id,
    initialValue: getEditFlashcardFormValues(flashcard),
    value: {
      id: flashcard.id,
      folderId: flashcard.folderId ?? "",
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
      await invalidateFlashcardViews(queryClient);
      return true;
    },
    onError: () => toast.error("Could not save the flashcard."),
  });

  return (
    <DetailPageLayout breadcrumb={breadcrumb} maxWidth="3xl">
      <div className="mb-4 flex min-w-0 items-start gap-2">
        {/* Mirrors the note header: an h-10 title row, then metadata. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1
            className="truncate text-xl leading-10 font-semibold tracking-tight"
            title={flashcard.folderPath}
          >
            {flashcard.folderPath}
          </h1>
          <FlashcardSourceReference source={flashcard.source} />
          {archivedAt ? <CardMarkNote icon={Archive} label="Archived" /> : null}
          {studyLaterAt && !archivedAt ? (
            <CardMarkNote icon={Clock} label="Study later" />
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
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
              <FlashcardActionMenuItems
                onCopy={() =>
                  void copyFlashcardsWithToast([
                    {
                      front: watchedFront,
                      back: watchedBack,
                      folderPath: flashcard.folderPath,
                    },
                  ])
                }
                onMove={() => setMoveOpen(true)}
                studyLaterMarked={studyLaterAt !== null}
                onToggleStudyLater={() =>
                  void toggleStudyLater(
                    queryClient,
                    { id: flashcard.id, studyLaterAt },
                    setStudyLaterAt,
                  )
                }
                archived={archivedAt !== null}
                onToggleArchived={() =>
                  void saveFlashcardsArchived(
                    queryClient,
                    [flashcard.id],
                    archivedAt === null,
                  ).then((saved) => {
                    if (!saved) return;
                    setArchivedAt(saved.archivedAt);
                    if (saved.archivedAt) setStudyLaterAt(null);
                  })
                }
                onReset={() => setResetOpen(true)}
                onDelete={() => setDeleteOpen(true)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <form onSubmit={(event) => event.preventDefault()}>
        <FlashcardCardEditor
          form={form}
          idPrefix="form-edit-flashcard"
          review={review}
          reviewDisabled={autosave.isSaving || isImageUploading}
          contentClassName="min-h-0 max-h-none"
          toolbarStickTo="page"
          onImageUploadPendingChange={(side, pending) =>
            side === "front"
              ? setIsFrontImageUploading(pending)
              : setIsBackImageUploading(pending)
          }
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

// A card's mark (archived or study later) as header metadata.
function CardMarkNote({
  icon: Icon,
  label,
}: Readonly<{ icon: LucideIcon; label: string }>) {
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
    </p>
  );
}
