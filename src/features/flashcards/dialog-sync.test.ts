import { describe, expect, it } from "vitest";
import {
  haveFlashcardDialogValuesChanged,
  shouldSyncFlashcardDialogValues,
} from "@/features/flashcards/dialog-sync";

const createValues = {
  deckId: "deck-1",
  front: "",
  back: "",
};

describe("haveFlashcardDialogValuesChanged", () => {
  it("returns false when flashcard dialog values are unchanged", () => {
    expect(
      haveFlashcardDialogValuesChanged(createValues, {
        deckId: "deck-1",
        front: "",
        back: "",
      }),
    ).toBe(false);
  });

  it("returns true when any tracked field changes", () => {
    expect(
      haveFlashcardDialogValuesChanged(createValues, {
        deckId: "deck-2",
        front: "",
        back: "",
      }),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(createValues, {
        deckId: "deck-1",
        front: "<p>Front</p>",
        back: "",
      }),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(createValues, {
        deckId: "deck-1",
        front: "",
        back: "<p>Back</p>",
      }),
    ).toBe(true);
  });
});

describe("shouldSyncFlashcardDialogValues", () => {
  it("syncs when the dialog opens", () => {
    expect(
      shouldSyncFlashcardDialogValues({
        open: true,
        wasOpen: false,
        previousValues: createValues,
        nextValues: createValues,
      }),
    ).toBe(true);
  });

  it("does not sync when source values are unchanged", () => {
    expect(
      shouldSyncFlashcardDialogValues({
        open: true,
        wasOpen: true,
        previousValues: createValues,
        nextValues: {
          deckId: "deck-1",
          front: "",
          back: "",
        },
      }),
    ).toBe(false);
  });

  it("syncs when external values change while the dialog is open", () => {
    expect(
      shouldSyncFlashcardDialogValues({
        open: true,
        wasOpen: true,
        previousValues: {
          id: "flashcard-1",
          deckId: "deck-1",
          front: "<p>Front</p>",
          back: "<p>Back</p>",
        },
        nextValues: {
          id: "flashcard-2",
          deckId: "deck-2",
          front: "<p>Other front</p>",
          back: "<p>Other back</p>",
        },
      }),
    ).toBe(true);
  });
});
