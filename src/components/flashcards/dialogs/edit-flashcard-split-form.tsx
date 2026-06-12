"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { SyntheticEvent } from "react";
import { CreateModeToggle } from "@/components/flashcards/dialogs/create-mode-toggle";
import { DeckSelect } from "@/components/shared/deck-select";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { DeckEntity } from "@/lib/server/api-contracts";

interface EditFlashcardSplitFormProps {
  decks: DeckEntity[];
  splitDeckId: string | null;
  splitFront: string;
  splitBack: string;
  isGenerating: boolean;
  isSplitImageUploading: boolean;
  modeOptions: Array<{ value: string; label: string }>;
  onDeckChange: (value: string | null) => void;
  onFrontChange: (value: string) => void;
  onBackChange: (value: string) => void;
  onModeChange: (mode: string) => void;
  onImageUploadPendingChange: (pending: boolean) => void;
  onSubmit: (event: SyntheticEvent) => void;
}

export function EditFlashcardSplitForm({
  decks,
  splitDeckId,
  splitFront,
  splitBack,
  isGenerating,
  isSplitImageUploading,
  modeOptions,
  onDeckChange,
  onFrontChange,
  onBackChange,
  onModeChange,
  onImageUploadPendingChange,
  onSubmit,
}: Readonly<EditFlashcardSplitFormProps>) {
  const hasFrontContent = splitFront.trim().length > 0;
  const hasBackContent = splitBack.trim().length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-5 sm:px-6">
        <FieldGroup className="gap-5">
          <DeckSelect
            value={splitDeckId}
            onChange={onDeckChange}
            decks={decks}
            id="split-deck"
          />
          <CreateModeToggle
            mode="split"
            onModeChange={onModeChange}
            options={modeOptions}
          />
          <Field>
            <div className="flex h-9 items-center justify-between gap-3">
              <FieldLabel htmlFor="split-front">Front</FieldLabel>
            </div>
            <TiptapEditor
              value={splitFront}
              onChange={onFrontChange}
              placeholder="e.g. What is photosynthesis?"
              id="split-front"
              contentClassName="min-h-11 max-h-[40svh]"
              imageUploadContext="flashcards"
              onImageUploadPendingChange={onImageUploadPendingChange}
            />
          </Field>
          <Field>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="split-back">Back</FieldLabel>
              </div>
            </div>
            <TiptapEditor
              value={splitBack}
              onChange={onBackChange}
              placeholder="e.g. Process plants use to convert light into energy."
              id="split-back"
              contentClassName="max-h-[10lh]"
              imageUploadContext="flashcards"
              onImageUploadPendingChange={onImageUploadPendingChange}
            />
          </Field>
        </FieldGroup>
      </div>
      <div className="shrink-0 border-t px-4 py-4 sm:px-6">
        <Button
          type="submit"
          disabled={
            isGenerating ||
            isSplitImageUploading ||
            !hasFrontContent ||
            !hasBackContent ||
            !splitDeckId
          }
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Splitting...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              {isSplitImageUploading ? "Uploading image..." : "Split Flashcard"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
