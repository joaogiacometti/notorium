"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { editFlashcard } from "@/app/actions/flashcards";
import { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import { useFlashcardDialogState } from "@/components/flashcards/dialogs/use-flashcard-dialog-state";
import { getEditFlashcardFormValues } from "@/components/flashcards/shared/edit-flashcard-form-values";
import { FlashcardCardEditor } from "@/components/flashcards/shared/flashcard-card-editor";
import { FlashcardSourceReference } from "@/components/flashcards/shared/flashcard-source-reference";
import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { Button } from "@/components/ui/button";
import {
  type FlashcardFormValues,
  flashcardFormSchema,
} from "@/features/flashcards/validation";
import type {
  FlashcardEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

type ReviewCard = FlashcardReviewState["cards"][number];

interface ReviewCardEditorProps {
  card: ReviewCard;
  subjectLabel: string;
  aiEnabled: boolean;
  onSaved: (flashcard: FlashcardEntity) => void | Promise<void>;
  onClose: () => void;
  /** Lays the card out in the session: content area plus footer actions. */
  renderSession: (content: ReactNode, footer: ReactNode) => ReactNode;
}

const formId = "form-review-edit-flashcard";

/**
 * Edits the session's current card in place, with the same card editor as the
 * detail page. Staying in the page (not a dialog) keeps the assistant usable.
 *
 * @example <ReviewCardEditor card={card} subjectLabel="Biology" aiEnabled onSaved={apply} onClose={stop} renderSession={layout} />
 */
export function ReviewCardEditor({
  card,
  subjectLabel,
  aiEnabled,
  onSaved,
  onClose,
  renderSession,
}: Readonly<ReviewCardEditorProps>) {
  const [initialValues] = useState(() => getEditFlashcardFormValues(card));
  const [pendingUploads, setPendingUploads] = useState(0);
  const form = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardFormSchema),
    defaultValues: initialValues,
  });
  const session = useFlashcardDialogState({
    mode: "edit",
    open: true,
    onOpenChange: (open) => !open && onClose(),
    values: initialValues,
    form,
    onSubmitAction: (values) => editFlashcard({ ...values, id: card.id }),
    onSuccess: async (flashcard) => {
      if (flashcard) await onSaved(flashcard);
    },
    getSuccessValues: (values) => values,
    closeOnSuccess: true,
  });
  const isUploading = pendingUploads > 0;
  const review = useActiveFlashcardEditor({
    form,
    enabled: aiEnabled,
    blocked: session.isSubmitting || isUploading,
  });
  const saveBlocked = session.isSubmitting || isUploading || review.blocked;
  const save = form.handleSubmit(async (values) => {
    if (!saveBlocked) await session.handleSubmit(values);
  });

  const content = (
    <form
      id={formId}
      onSubmit={save}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        session.handleOpenChange(false);
      }}
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 empty:hidden">
        {subjectLabel ? (
          <p className="truncate text-xs font-semibold tracking-wide text-primary/80 uppercase">
            {subjectLabel}
          </p>
        ) : null}
        <FlashcardSourceReference
          source={card.source}
          newTab
          className="ml-auto max-w-[50%]"
        />
      </div>
      <FlashcardCardEditor
        form={form}
        idPrefix={formId}
        review={review}
        reviewDisabled={session.isSubmitting || isUploading}
        frontError={
          session.isDuplicateFront ? session.duplicateFrontMessage : null
        }
        onCtrlEnter={() => void save()}
        onImageUploadPendingChange={(_side, pending) =>
          setPendingUploads((count) =>
            pending ? count + 1 : Math.max(0, count - 1),
          )
        }
      />
    </form>
  );

  const footer = (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={() => session.handleOpenChange(false)}
        disabled={session.isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        size="lg"
        disabled={saveBlocked}
        aria-keyshortcuts="Control+Enter Meta+Enter"
      >
        <AsyncButtonContent
          pending={session.isSubmitting}
          idleLabel="Save"
          pendingLabel="Saving..."
        />
      </Button>
    </div>
  );

  return (
    <>
      {renderSession(content, footer)}
      <UnsavedChangesDialog
        open={session.discardDialogOpen}
        onOpenChange={session.setDiscardDialogOpen}
        onDiscard={session.handleDiscardChanges}
      />
    </>
  );
}
