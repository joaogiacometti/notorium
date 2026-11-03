import { describe, expect, it } from "vitest";
import {
  haveFlashcardDialogValuesChanged,
  shouldSyncFlashcardDialogValues,
} from "@/features/flashcards/dialog-sync";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import { testDocument } from "@/test/document";

function values(
  overrides: Partial<FlashcardFormValues> = {},
): FlashcardFormValues {
  return {
    subjectId: "deck-1",
    front: testDocument(""),
    back: testDocument(""),
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
        values({ subjectId: "deck-2" }),
      ),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(
        createValues,
        values({ front: testDocument("<p>Front</p>") }),
      ),
    ).toBe(true);

    expect(
      haveFlashcardDialogValuesChanged(
        createValues,
        values({ back: testDocument("<p>Back</p>") }),
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
          front: testDocument("<p>Front</p>"),
          back: testDocument("<p>Back</p>"),
        }),
        nextValues: values({
          id: "flashcard-2",
          subjectId: "deck-2",
          front: testDocument("<p>Other front</p>"),
          back: testDocument("<p>Other back</p>"),
        }),
      }),
    ).toBe(true);
  });
});
