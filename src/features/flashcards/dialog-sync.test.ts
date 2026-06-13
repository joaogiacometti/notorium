import { describe, expect, it } from "vitest";
import {
  haveFlashcardDialogValuesChanged,
  shouldSyncFlashcardDialogValues,
} from "@/features/flashcards/dialog-sync";
import type { FlashcardFormValues } from "@/features/flashcards/validation";

function values(
  overrides: Partial<FlashcardFormValues> = {},
): FlashcardFormValues {
  return {
    type: "basic",
    deckId: "deck-1",
    front: "",
    back: "",
    clozeSource: "",
    occlusionImagePathname: "",
    occlusionRegions: [],
    ...overrides,
  };
}

const createValues = values();

describe("haveFlashcardDialogValuesChanged", () => {
  it("returns false when flashcard dialog values are unchanged", () => {
    expect(haveFlashcardDialogValuesChanged(createValues, values())).toBe(
      false,
    );
  });

  it("returns true when any tracked field changes", () => {
    expect(
      haveFlashcardDialogValuesChanged(
        createValues,
        values({ deckId: "deck-2" }),
      ),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(
        createValues,
        values({ front: "<p>Front</p>" }),
      ),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(
        createValues,
        values({ back: "<p>Back</p>" }),
      ),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(
        createValues,
        values({ clozeSource: "<p>{{c1::x}}</p>" }),
      ),
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
        nextValues: values(),
      }),
    ).toBe(false);
  });

  it("syncs when external values change while the dialog is open", () => {
    expect(
      shouldSyncFlashcardDialogValues({
        open: true,
        wasOpen: true,
        previousValues: values({
          id: "flashcard-1",
          front: "<p>Front</p>",
          back: "<p>Back</p>",
        }),
        nextValues: values({
          id: "flashcard-2",
          deckId: "deck-2",
          front: "<p>Other front</p>",
          back: "<p>Other back</p>",
        }),
      }),
    ).toBe(true);
  });
});
