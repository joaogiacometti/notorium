"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateModeToggle } from "@/components/flashcards/create-mode-toggle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface GeneratedCard {
  id: string;
  front: string;
  back: string;
  selected: boolean;
}

interface GenerateFlashcardsReviewProps {
  cards: Array<{ front: string; back: string }>;
  onCreate: (cards: Array<{ front: string; back: string }>) => Promise<number>;
  onBack?: () => void;
  isCreating: boolean;
  typeToggle?: {
    mode: "single" | "ai";
    onModeChange: (mode: "single" | "ai") => void;
    disabled?: boolean;
  };
}

export function GenerateFlashcardsReview({
  cards: initialCards,
  onCreate,
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

  async function handleCreate() {
    const selectedCards = cards
      .filter((c) => c.selected)
      .map((c) => ({ front: c.front, back: c.back }));
    const createdCount = await onCreate(selectedCards);
    if (createdCount < selectedCards.length) {
      setCards((prev) => prev.map((c) => ({ ...c, selected: false })));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {typeToggle ? (
        <CreateModeToggle
          mode={typeToggle.mode}
          onModeChange={typeToggle.onModeChange}
          disabled={typeToggle.disabled}
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

      <div className="max-h-[50vh] overflow-y-auto">
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
                        <Textarea
                          id={`edit-front-${index}`}
                          value={editFront}
                          onChange={(e) => setEditFront(e.target.value)}
                          rows={2}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`edit-back-${index}`}>
                          Back
                        </FieldLabel>
                        <Textarea
                          id={`edit-back-${index}`}
                          value={editBack}
                          onChange={(e) => setEditBack(e.target.value)}
                          rows={3}
                        />
                      </Field>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={saveEdit}>
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
                        <p className="text-sm">{card.front}</p>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm font-medium">Back</p>
                        <p className="text-sm">{card.back}</p>
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
        disabled={selectedCount === 0 || isCreating}
        className="w-full"
      >
        {isCreating
          ? `Creating ${selectedCount} cards...`
          : `Create ${selectedCount} Card${selectedCount !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
