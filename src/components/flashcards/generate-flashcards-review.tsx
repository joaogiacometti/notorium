"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateModeToggle } from "@/components/flashcards/create-mode-toggle";
import { LazyTiptapEditor as TiptapEditor } from "@/components/shared/lazy-tiptap-editor";
import { TiptapRenderer } from "@/components/shared/tiptap-renderer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface GeneratedCard {
  id: string;
  front: string;
  back: string;
  selected: boolean;
}

interface GenerateFlashcardsReviewProps {
  cards: Array<{ front: string; back: string }>;
  onCreate: (cards: Array<{ front: string; back: string }>) => Promise<number>;
  onCardsChange?: (cards: Array<{ front: string; back: string }>) => void;
  onBack?: () => void;
  isCreating: boolean;
  typeToggle?: {
    mode: string;
    onModeChange: (mode: string) => void;
    disabled?: boolean;
    options?: Array<{ value: string; label: string }>;
  };
}

export function GenerateFlashcardsReview({
  cards: initialCards,
  onCreate,
  onCardsChange,
  onBack,
  isCreating,
  typeToggle,
}: Readonly<GenerateFlashcardsReviewProps>) {
  const [cards, setCards] = useState<GeneratedCard[]>(() =>
    initialCards.map((card) => ({
      id: crypto.randomUUID(),
      front: card.front,
      back: card.back,
      selected: true,
    })),
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [pendingImageUploads, setPendingImageUploads] = useState(0);

  useEffect(() => {
    setCards((prevCards) => {
      return initialCards.map((card, i) => ({
        id: prevCards[i]?.id ?? crypto.randomUUID(),
        front: card.front,
        back: card.back,
        selected: true,
      }));
    });
  }, [initialCards]);

  useEffect(() => {
    onCardsChange?.(
      cards.map((card) => ({ front: card.front, back: card.back })),
    );
  }, [cards, onCardsChange]);

  const selectedCount = cards.filter((c) => c.selected).length;
  const allSelected = cards.every((c) => c.selected);
  const noneSelected = cards.every((c) => !c.selected);

  function toggleAll(selected: boolean) {
    setCards(cards.map((c) => ({ ...c, selected })));
  }

  function toggleCard(index: number) {
    setCards(
      cards.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c)),
    );
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditFront(cards[index].front);
    setEditBack(cards[index].back);
  }

  function saveEdit() {
    if (editingIndex === null) return;
    setCards(
      cards.map((c, i) =>
        i === editingIndex ? { ...c, front: editFront, back: editBack } : c,
      ),
    );
    setEditingIndex(null);
  }

  function cancelEdit() {
    setEditingIndex(null);
  }

  function handleImageUploadPendingChange(pending: boolean) {
    setPendingImageUploads((current) => {
      if (pending) {
        return current + 1;
      }

      return Math.max(0, current - 1);
    });
  }

  async function handleCreate() {
    const selectedCards = cards
      .filter((c) => c.selected)
      .map((c) => ({ front: c.front, back: c.back }));
    const createdCount = await onCreate(selectedCards);
    if (createdCount < selectedCards.length) {
      setCards((prev) => prev.map((c) => ({ ...c, selected: false })));
    }
  }

  let buttonText = `Create ${selectedCount} Cards`;
  if (selectedCount === 1) {
    buttonText = "Create 1 Card";
  }
  if (isCreating) {
    buttonText = `Creating ${selectedCount} cards...`;
  }
  if (pendingImageUploads > 0) {
    buttonText = "Uploading image...";
  }

  return (
    <div className="flex flex-col gap-4">
      {typeToggle ? (
        <CreateModeToggle
          mode={typeToggle.mode}
          onModeChange={typeToggle.onModeChange}
          disabled={typeToggle.disabled}
          options={typeToggle.options}
        />
      ) : null}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              disabled={isCreating}
            >
              <ArrowLeft className="mr-1 size-4" />
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleAll(true)}
            disabled={allSelected}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleAll(false)}
            disabled={noneSelected}
          >
            Deselect All
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          {selectedCount} of {cards.length} selected
        </p>
      </div>

      <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
        <FieldGroup className="gap-3">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="rounded-lg border p-3"
              data-selected={card.selected}
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={card.selected}
                  onCheckedChange={() => toggleCard(index)}
                  aria-label={`Select card ${index + 1}`}
                />
                <div className="flex-1">
                  {editingIndex === index ? (
                    <FieldGroup className="gap-2">
                      <Field>
                        <FieldLabel htmlFor={`edit-front-${index}`}>
                          Front
                        </FieldLabel>
                        <TiptapEditor
                          value={editFront}
                          onChange={setEditFront}
                          id={`edit-front-${index}`}
                          contentClassName="min-h-11 max-h-[20vh]"
                          showToolbar={false}
                          imageUploadContext="flashcards"
                          onImageUploadPendingChange={
                            handleImageUploadPendingChange
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`edit-back-${index}`}>
                          Back
                        </FieldLabel>
                        <TiptapEditor
                          value={editBack}
                          onChange={setEditBack}
                          id={`edit-back-${index}`}
                          contentClassName="min-h-11 max-h-[20vh]"
                          showToolbar={false}
                          imageUploadContext="flashcards"
                          onImageUploadPendingChange={
                            handleImageUploadPendingChange
                          }
                        />
                      </Field>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={saveEdit}
                          disabled={pendingImageUploads > 0}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </FieldGroup>
                  ) : (
                    <>
                      <div className="mb-1">
                        <p className="text-sm font-medium">Front</p>
                        <TiptapRenderer
                          content={card.front}
                          className="text-sm"
                        />
                      </div>
                      <div className="mb-2">
                        <p className="text-sm font-medium">Back</p>
                        <TiptapRenderer
                          content={card.back}
                          className="text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  {editingIndex !== index && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Edit card ${index + 1}`}
                      onClick={() => startEdit(index)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </FieldGroup>
      </div>

      <Button
        type="button"
        onClick={() => void handleCreate()}
        disabled={selectedCount === 0 || isCreating || pendingImageUploads > 0}
        className="w-full"
      >
        {buttonText}
      </Button>
    </div>
  );
}
