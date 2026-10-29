"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Controller,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";
import type { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import {
  FlashcardFace,
  type FlashcardSide,
} from "@/components/flashcards/shared/flashcard-face";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import type { EditorToolbarTarget } from "@/components/shared/tiptap-editor";
import {
  EDITOR_ROOT_ATTRIBUTE,
  TiptapFormattingToolbar,
} from "@/components/shared/tiptap-formatting-toolbar";
import { FieldError } from "@/components/ui/field";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import { cn } from "@/lib/utils";

const FlashcardFieldReview = dynamic(
  () =>
    import("@/components/flashcards/dialogs/flashcard-field-review").then(
      (module) => module.FlashcardFieldReview,
    ),
  { ssr: false },
);

type FlashcardEditorReview = ReturnType<typeof useActiveFlashcardEditor>;

interface FlashcardCardEditorProps<TValues extends FlashcardFormValues> {
  form: UseFormReturn<TValues>;
  idPrefix: string;
  review: FlashcardEditorReview;
  /** Disables Accept/Discard on AI suggestions while a save or upload runs. */
  reviewDisabled: boolean;
  /** Save-time error for the front that is not a schema error (duplicates). */
  frontError?: string | null;
  /** Changing it remounts both editors, e.g. after a create clears the form. */
  editorKey?: string | number;
  /** Height bounds for each face's editable area. */
  contentClassName?: string;
  /**
   * Where the toolbar sticks while a long card scrolls: under the page top bar
   * when the page scrolls, or at the top of a scrolling dialog/session region.
   */
  toolbarStickTo?: "page" | "container";
  onCtrlEnter?: () => void;
  onImageUploadPendingChange: (side: FlashcardSide, pending: boolean) => void;
}

const sides: FlashcardSide[] = ["front", "back"];

const placeholders: Record<FlashcardSide, string> = {
  front: "Question or prompt",
  back: "Answer",
};

/**
 * The one flashcard editing surface: a single formatting toolbar that follows
 * the focused face, over Front and Back stacked like the review card. The
 * detail page, the create dialog, and review sessions all render this.
 *
 * @example <FlashcardCardEditor form={form} idPrefix="card" review={review} reviewDisabled={false} onImageUploadPendingChange={track} />
 */
export function FlashcardCardEditor<TValues extends FlashcardFormValues>({
  form,
  idPrefix,
  review,
  reviewDisabled,
  frontError,
  editorKey = 0,
  contentClassName = "min-h-20 max-h-none",
  toolbarStickTo = "container",
  onCtrlEnter,
  onImageUploadPendingChange,
}: Readonly<FlashcardCardEditorProps<TValues>>) {
  const [targets, setTargets] = useState<
    Partial<Record<FlashcardSide, EditorToolbarTarget>>
  >({});
  const [activeSide, setActiveSide] = useState<FlashcardSide>("front");
  const toolbarSide = resolveToolbarSide(targets, activeSide);
  const toolbarTarget = toolbarSide ? targets[toolbarSide] : undefined;

  function trackTarget(
    side: FlashcardSide,
    target: EditorToolbarTarget | null,
  ) {
    setTargets((current) => ({ ...current, [side]: target ?? undefined }));
  }

  return (
    <div
      {...{ [EDITOR_ROOT_ATTRIBUTE]: "" }}
      // overflow-clip, not hidden: hidden would make this the sticky toolbar's
      // scroll container and pin it to nothing.
      className="min-w-0 overflow-clip rounded-lg border bg-card transition-colors focus-within:border-ring"
    >
      <div
        className={cn(
          "sticky z-raised bg-card",
          toolbarStickTo === "page" ? "top-14" : "top-0",
        )}
      >
        {toolbarTarget ? (
          <TiptapFormattingToolbar
            key={toolbarSide}
            editor={toolbarTarget.editor}
            imageUploadPending={toolbarTarget.imageUploadPending}
            onEditLink={toolbarTarget.onEditLink}
            onSelectImage={toolbarTarget.onSelectImage}
          />
        ) : (
          <div className="h-10.25 border-b" />
        )}
      </div>
      {sides.map((side) => (
        <Controller
          key={side}
          name={side as FieldPath<TValues>}
          control={form.control}
          render={({ field, fieldState }) => {
            const id = `${idPrefix}-${side}`;
            const sideError = side === "front" ? frontError : null;
            const pending = review.pending?.fields[side];
            return (
              <FlashcardFace side={side} htmlFor={id}>
                {pending ? (
                  <FlashcardFieldReview
                    key={`${review.pending?.toolCallId}-${side}`}
                    field={side}
                    disabled={reviewDisabled}
                    proposal={pending}
                    onDecide={(accept) => review.decide?.(side, accept)}
                  />
                ) : (
                  <TiptapEditor
                    key={`${id}-${editorKey}`}
                    value={(field.value ?? "") as string}
                    onChange={field.onChange}
                    placeholder={placeholders[side]}
                    id={id}
                    aria-invalid={fieldState.invalid || Boolean(sideError)}
                    imageUploadContext="flashcards"
                    contentClassName={cn("text-base", contentClassName)}
                    onCtrlEnter={onCtrlEnter}
                    onFocus={() => setActiveSide(side)}
                    onToolbarTargetChange={(target) =>
                      trackTarget(side, target)
                    }
                    onImageUploadPendingChange={(uploading) =>
                      onImageUploadPendingChange(side, uploading)
                    }
                  />
                )}
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
                {!fieldState.invalid && sideError ? (
                  <p className="text-destructive text-sm">{sideError}</p>
                ) : null}
              </FlashcardFace>
            );
          }}
        />
      ))}
    </div>
  );
}

function resolveToolbarSide(
  targets: Partial<Record<FlashcardSide, EditorToolbarTarget>>,
  activeSide: FlashcardSide,
): FlashcardSide | undefined {
  if (targets[activeSide]) return activeSide;
  return sides.find((side) => targets[side]);
}
